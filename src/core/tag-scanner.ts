/**
 * The canonical reader for a Cotton tag and its attributes.
 *
 * Why this is a scanner and not a regex: a regex has no notion of "I am inside
 * a value". Every attribute reader in this extension used to be its own
 * `/\s(:?)([\w-]+)(?:=...)?/g`-shaped pattern, and each one leaked the same
 * three ways:
 *
 *   1. The tag body was found with `[^>]*?`, so a `>` inside a value — an arrow
 *      function, `a > b`, `{% if a > b %}` — truncated the body mid-value and
 *      threw away the closing quote. The value group was optional, so the
 *      attribute then read as a bare flag and the cursor landed *inside* the
 *      expression, turning every identifier into a phantom attribute.
 *   2. Framework prefixes were not in the name character class. `@click` and
 *      `::value` were never matched, so their values were never consumed and
 *      the same walk-into-the-value happened.
 *   3. Django `{# ... #}` comments inside a tag body were read as attributes,
 *      so ordinary prose became a list of phantom attributes.
 *
 * Phantom attributes are not a cosmetic problem. They produce false "duplicate"
 * and "unknown prop" diagnostics, and — worse — a phantom that happens to share
 * a required prop's name silently suppresses that prop's missing-required
 * warning. This module exists so there is exactly one place that gets it right.
 *
 * Everything here is pure: no `vscode` import, no I/O.
 */

/** What an attribute is, from Cotton's point of view.
 *  - `static`  — `size="md"`, a plain prop with a literal value.
 *  - `dynamic` — `:size="expr"`, Cotton's expression form of the same prop.
 *  - `other`   — `@click`, `::class`, `x-on:click.away`: framework attributes
 *                that Cotton passes straight through. Never a declared prop, so
 *                prop-facing checks must skip them. */
export type AttrKind = 'static' | 'dynamic' | 'other';

export interface TagAttribute {
    /** The name exactly as written, prefixes included (`:size`, `@click`). */
    raw: string;
    /** The name with any leading `@`/`:` markers stripped — the prop-facing
     *  name. `:size` and `size` both yield `size`. */
    name: string;
    kind: AttrKind;
    /** Value with surrounding quotes removed. `undefined` for a bare flag. */
    value?: string;
    /** The quote character used, or `''` when the value was unquoted. */
    quote?: string;
    /** Offset of `raw` within the scanned body. */
    nameOffset: number;
    /** Offset of the value's first character (inside the quotes) within the
     *  scanned body. `undefined` when there is no value. */
    valueOffset?: number;
}

export interface CottonTag {
    /** Dotted tag name without the `c-` prefix (`atoms.button`). */
    name: string;
    /** Attribute body: everything between the name and the closing `>`, with a
     *  self-closing `/` excluded. Carries its leading whitespace. */
    body: string;
    /** Offset of the `<` in the source text. */
    index: number;
    /** Offset of `body` in the source text. */
    bodyOffset: number;
    selfClosing: boolean;
    /** Offset one past the closing `>`. */
    end: number;
}

/** A plain prop: `size`. Deliberately excludes `.` and `:` so `x-on:click` and
 *  `foo.bar` fall through to `other`. The leading `[A-Za-z_]` anchor is what
 *  stops an unquoted value (`count=3`) from ever reading as a prop named `3`. */
const STATIC_NAME_RE = /^[A-Za-z_][\w-]*$/;
/** Cotton's dynamic form: exactly one leading colon, then a plain prop name. */
const DYNAMIC_NAME_RE = /^:[A-Za-z_][\w-]*$/;

/** Django constructs that may appear inside a tag body and must be skipped
 *  wholesale — their contents are not attributes and may contain `>` or an
 *  unbalanced quote. */
const DJANGO_BLOCKS: readonly [string, string][] = [
    ['{#', '#}'],
    ['{%', '%}'],
    ['{{', '}}'],
];

function isSpace(ch: string): boolean {
    return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v';
}

/** An attribute name may start with a framework marker or a letter. A digit is
 *  deliberately not a valid start — see STATIC_NAME_RE. */
function isNameStart(ch: string): boolean {
    return ch === '@' || ch === ':' || /[A-Za-z_]/.test(ch);
}

function isNameChar(ch: string): boolean {
    return /[\w.:-]/.test(ch);
}

/** If `text` opens a Django block at `i`, return the offset just past its
 *  closing delimiter — or `text.length` when it is never closed, so callers
 *  consume the remainder instead of reading prose as attributes. */
function skipDjangoBlock(text: string, i: number): number | undefined {
    for (const [open, close] of DJANGO_BLOCKS) {
        if (!text.startsWith(open, i)) { continue; }
        const end = text.indexOf(close, i + open.length);
        return end === -1 ? text.length : end + close.length;
    }
    return undefined;
}

function classify(raw: string): AttrKind {
    if (STATIC_NAME_RE.test(raw)) { return 'static'; }
    if (DYNAMIC_NAME_RE.test(raw)) { return 'dynamic'; }
    return 'other';
}

/**
 * Read every attribute out of a tag body.
 *
 * Handles: bare flags (`wide`), both quote styles, unquoted values (`count=3`),
 * whitespace around `=`, framework prefixes (`@click`, `::value`,
 * `x-on:click.away`), and Django blocks in attribute position. A value is
 * always consumed as one unit, so its contents can never surface as attributes.
 */
export function scanTagAttributes(body: string): TagAttribute[] {
    const attrs: TagAttribute[] = [];
    let i = 0;

    while (i < body.length) {
        const ch = body[i];

        if (isSpace(ch)) { i++; continue; }

        const afterBlock = skipDjangoBlock(body, i);
        if (afterBlock !== undefined) { i = afterBlock; continue; }

        // Anything that cannot start a name is stray punctuation (a lone `/`, a
        // quote left over from malformed markup). Step over one character so the
        // scan always advances.
        if (!isNameStart(ch)) { i++; continue; }

        const nameOffset = i;
        // The start character is consumed unconditionally: `@` opens a name but
        // is not a name character, so testing it against isNameChar would read
        // zero characters and never advance the scan.
        i++;
        while (i < body.length && isNameChar(body[i])) { i++; }
        const raw = body.substring(nameOffset, i);

        // A prefix with nothing behind it (`@`, `::`) is stray punctuation, not
        // an attribute. `i` has already advanced, so the scan still progresses.
        if (stripPrefix(raw) === '') { continue; }

        // Cotton's tag parser tolerates spaces around `=`, so look past
        // whitespace for one — but only commit to consuming it if it is there,
        // otherwise this is a bare flag and the whitespace belongs to the next
        // attribute.
        let probe = i;
        while (probe < body.length && isSpace(body[probe])) { probe++; }

        if (body[probe] !== '=') {
            attrs.push({ raw, name: stripPrefix(raw), kind: classify(raw), nameOffset });
            continue;
        }

        probe++;
        while (probe < body.length && isSpace(body[probe])) { probe++; }

        const quote = body[probe];
        if (quote === '"' || quote === '\'') {
            const valueOffset = probe + 1;
            const close = body.indexOf(quote, valueOffset);
            // An unterminated value means the author is mid-edit. Treat the rest
            // of the body as the value rather than tokenizing prose out of it.
            const valueEnd = close === -1 ? body.length : close;
            attrs.push({
                raw, name: stripPrefix(raw), kind: classify(raw),
                value: body.substring(valueOffset, valueEnd),
                quote, nameOffset, valueOffset,
            });
            i = close === -1 ? body.length : close + 1;
            continue;
        }

        // Unquoted value: `count=3`, `open=False`. Ends at whitespace or at the
        // tag's own punctuation.
        const valueOffset = probe;
        while (probe < body.length && !isSpace(body[probe]) && body[probe] !== '/' && body[probe] !== '>') { probe++; }
        attrs.push({
            raw, name: stripPrefix(raw), kind: classify(raw),
            value: body.substring(valueOffset, probe),
            quote: '', nameOffset, valueOffset,
        });
        i = probe;
    }

    return attrs;
}

function stripPrefix(raw: string): string {
    return raw.replace(/^[@:]+/, '');
}

/** Walk from just past a tag name to its closing `>`, stepping over quoted
 *  values and Django blocks so a `>` inside either does not end the tag.
 *  Returns `undefined` for a tag that is never closed — a `<` at this level
 *  means the author left it open, and swallowing the rest of the document would
 *  be far worse than skipping one tag. */
function scanToTagEnd(text: string, from: number): { gt: number; bodyEnd: number; selfClosing: boolean } | undefined {
    let i = from;
    while (i < text.length) {
        const ch = text[i];

        const afterBlock = skipDjangoBlock(text, i);
        if (afterBlock !== undefined) {
            if (afterBlock >= text.length) { return undefined; }
            i = afterBlock;
            continue;
        }

        if (ch === '"' || ch === '\'') {
            const close = text.indexOf(ch, i + 1);
            if (close === -1) { return undefined; }
            i = close + 1;
            continue;
        }

        if (ch === '>') {
            let k = i - 1;
            while (k >= from && isSpace(text[k])) { k--; }
            const selfClosing = text[k] === '/';
            return { gt: i, bodyEnd: selfClosing ? k : i, selfClosing };
        }

        if (ch === '<') { return undefined; }

        i++;
    }
    return undefined;
}

const TAG_HEAD_RE = /<c-([\w.-]+)/g;

/**
 * Find every `<c-NAME ...>` opening tag in `text`, quote- and Django-aware.
 *
 * Supersedes scanning with `cottonTagOpenRe()` for any caller that then reads
 * attributes: that regex's `[^>]*?` body silently truncates at the first `>`
 * inside a value, which is exactly what let JavaScript identifiers leak out of
 * `x-data`-style attributes and be reported as props.
 */
export function findCottonTags(text: string): CottonTag[] {
    const tags: CottonTag[] = [];
    const re = TAG_HEAD_RE;
    re.lastIndex = 0;

    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        const bodyOffset = m.index + m[0].length;
        // A name must be followed by whitespace or the tag's own punctuation;
        // otherwise `[\w.-]+` already consumed everything it could and this is
        // something else entirely.
        const found = scanToTagEnd(text, bodyOffset);
        if (!found) { continue; }

        tags.push({
            name: m[1],
            body: text.substring(bodyOffset, found.bodyEnd),
            index: m.index,
            bodyOffset,
            selfClosing: found.selfClosing,
            end: found.gt + 1,
        });
        re.lastIndex = found.gt + 1;
    }

    return tags;
}
