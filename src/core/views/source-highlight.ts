/**
 * Lightweight syntax highlighter for the Cotton Components detail panel.
 *
 * Tokenizes Cotton-flavored Django templates (HTML + Django expressions +
 * cotton annotation comments) and emits HTML with semantic class names.
 * The detail webview owns the CSS that maps those classes to colors.
 *
 * Why hand-rolled vs Shiki/Highlight.js: keeping it dep-free. The grammar
 * we care about is small and well-bounded — three Django delimiters, HTML
 * tag/attr pairs, plus the cotton annotation vocabulary. A real tokenizer
 * gives us the precision we need without a megabyte of grammar tables.
 */

import { scanTagAttributes } from '../tag-scanner';

type Token =
    | { kind: 'comment'; text: string }      // {# ... #}, with cotton @annotations
    | { kind: 'django-tag'; text: string }   // {% ... %}
    | { kind: 'django-var'; text: string }   // {{ ... }}
    | { kind: 'html-tag'; text: string }     // <tag ...> or </tag>
    | { kind: 'text'; text: string };

/** Render `source` as HTML with `<span class="tok-...">` wrappers. The
 *  return value is safe to inject into the webview body. */
export function highlightSource(source: string): string {
    return tokenize(source).map(renderToken).join('');
}

// ── Tokenizer ─────────────────────────────────────────────────────────────

export function tokenize(source: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    let textStart = 0;

    const flushText = (until: number) => {
        if (until > textStart) {
            tokens.push({ kind: 'text', text: source.substring(textStart, until) });
        }
    };

    while (i < source.length) {
        if (source.startsWith('{#', i)) {
            const end = source.indexOf('#}', i + 2);
            if (end !== -1) {
                flushText(i);
                tokens.push({ kind: 'comment', text: source.substring(i, end + 2) });
                i = end + 2;
                textStart = i;
                continue;
            }
        }
        if (source.startsWith('{%', i)) {
            const end = source.indexOf('%}', i + 2);
            if (end !== -1) {
                flushText(i);
                tokens.push({ kind: 'django-tag', text: source.substring(i, end + 2) });
                i = end + 2;
                textStart = i;
                continue;
            }
        }
        if (source.startsWith('{{', i)) {
            const end = source.indexOf('}}', i + 2);
            if (end !== -1) {
                flushText(i);
                tokens.push({ kind: 'django-var', text: source.substring(i, end + 2) });
                i = end + 2;
                textStart = i;
                continue;
            }
        }
        if (source[i] === '<' && (source[i + 1] === '/' || /[a-zA-Z]/.test(source[i + 1] ?? ''))) {
            const end = source.indexOf('>', i);
            if (end !== -1) {
                flushText(i);
                tokens.push({ kind: 'html-tag', text: source.substring(i, end + 1) });
                i = end + 1;
                textStart = i;
                continue;
            }
        }
        i++;
    }
    flushText(source.length);
    return tokens;
}

// ── Renderer ──────────────────────────────────────────────────────────────

function renderToken(t: Token): string {
    switch (t.kind) {
        case 'comment':    return `<span class="tok-comment">${renderComment(t.text)}</span>`;
        case 'django-tag': return `<span class="tok-django">${renderDjangoTag(t.text)}</span>`;
        case 'django-var': return `<span class="tok-django">${escapeHtml(t.text)}</span>`;
        case 'html-tag':   return renderHtmlTag(t.text);
        case 'text':       return escapeHtml(t.text);
    }
}

/** Tag head: bracket + name + attrs + bracket. Each piece gets its own
 *  class so the theme can color them independently. */
function renderHtmlTag(text: string): string {
    const m = /^(<\/?)([\w.-]+)([\s\S]*?)(\/?>)$/.exec(text);
    if (!m) { return escapeHtml(text); }
    const [, openB, name, attrs, closeB] = m;
    return (
        `<span class="tok-bracket">${escapeHtml(openB)}</span>` +
        `<span class="tok-tag">${escapeHtml(name)}</span>` +
        renderAttrs(attrs) +
        `<span class="tok-bracket">${escapeHtml(closeB)}</span>`
    );
}

/** Colour attribute names and values inside a tag head. Anything the scanner
 *  does not claim as an attribute — whitespace, Django comments, stray
 *  punctuation — is emitted verbatim, so the preview never loses a character. */
function renderAttrs(attrs: string): string {
    let out = '';
    let cursor = 0;
    for (const attr of scanTagAttributes(attrs)) {
        if (attr.nameOffset > cursor) {
            out += escapeHtml(attrs.substring(cursor, attr.nameOffset));
        }
        out += `<span class="tok-attr">${escapeHtml(attr.raw)}</span>`;
        cursor = attr.nameOffset + attr.raw.length;

        if (attr.value === undefined) { continue; }

        // The opening quote (when there is one) belongs to the string span; the
        // `=` and any whitespace around it are punctuation.
        const quoteLen = attr.quote ? 1 : 0;
        const stringStart = attr.valueOffset! - quoteLen;
        if (stringStart > cursor) {
            out += `<span class="tok-punct">${escapeHtml(attrs.substring(cursor, stringStart))}</span>`;
        }
        // Clamped because an unterminated value has no closing quote to include.
        const stringEnd = Math.min(attrs.length, attr.valueOffset! + attr.value.length + quoteLen);
        out += `<span class="tok-string">${escapeHtml(attrs.substring(stringStart, stringEnd))}</span>`;
        cursor = stringEnd;
    }
    if (cursor < attrs.length) {
        out += escapeHtml(attrs.substring(cursor));
    }
    return out;
}

/** Cotton annotation inside `{# ... #}`: highlight the `@keyword`, then
 *  the chain of `| filter[:value]` pieces. Plain `{# comment #}` keeps
 *  the comment color end-to-end. */
function renderComment(text: string): string {
    const escaped = escapeHtml(text);
    return escaped
        .replace(/(@\w+)/g, '<span class="tok-anno">$1</span>')
        .replace(/(\|)(\s*)(\w+)(:)?/g, (_match, pipe, ws, filter, colon) =>
            `<span class="tok-punct">${pipe}</span>${ws}<span class="tok-filter">${filter}</span>${colon ? `<span class="tok-punct">${colon}</span>` : ''}`,
        );
}

/** Django `{% tag args %}` — keyword right after `{%` gets its own class. */
function renderDjangoTag(text: string): string {
    const escaped = escapeHtml(text);
    return escaped.replace(/^(\{%\s*)(\w+)/, (_match, open, kw) =>
        `${open}<span class="tok-keyword">${kw}</span>`,
    );
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
