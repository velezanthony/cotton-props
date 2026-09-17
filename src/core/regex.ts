/**
 * Narrow Cotton regexes, each with one specific job (semantic-token
 * highlighting, the `<c-component>` dispatch scan, the `<c-vars>` reader).
 * The canonical reader for a `<c-...>` tag and its attributes is
 * `tag-scanner.ts` (`findCottonTags`/`scanTagAttributes`) — reach for that
 * whenever a scan has to survive a `>` or a quote inside an attribute value.
 *
 * Why factories instead of shared constants: regexes with the `/g` flag
 * carry mutable `lastIndex` state. If two providers shared the same
 * RegExp instance, one's mid-iteration `exec()` would corrupt the other's
 * cursor. Factories hand out a fresh instance per call, so the state stays
 * local to the caller.
 *
 * These patterns cross newlines (`[^>]` and `[\s\S]` both match `\n` in
 * JavaScript), so multi-line tag declarations are fine. What a `[^>]` body
 * cannot survive is a `>` inside an attribute value: the tag ends there and
 * every attribute after it is lost. When the value contents matter, use
 * `findTagEnd()`/`findCottonTags()` in `tag-scanner.ts`.
 */

/**
 * Opening tag for any Cotton component: `<c-NAME [attrs] [/]>`.
 *
 * Capture groups:
 *   [1] — tag name (e.g. `atoms.button`, `component`, `vars`)
 *   [2] — attribute string with its leading whitespace (`` if no attrs)
 *   [3] — `'/'` when self-closing, `undefined` otherwise
 *
 * Built-in tags (`vars`, `slot`, `component`) are matched by this same
 * pattern — callers that want to skip them check `BUILTIN_TAGS.includes(name)`.
 */
export function cottonTagOpenRe(): RegExp {
    // The attrs body uses `[^>]*?` (non-greedy) so the trailing `\s*(\/)?`
    // can claim the leading `/` of a self-closing tag. A greedy body would
    // swallow the `/` and group [3] would always be `undefined`.
    return /<c-([\w.-]+)((?:\s[^>]*?)?)\s*(\/)?>/g;
}

/**
 * Opening tag for the `<c-component>` dispatcher specifically.
 *
 * Capture groups:
 *   [1] — attribute string (multi-line capable, `` if no attrs)
 *
 * Used by `findIsAttributes()` in `is-context.ts`, the shared helper behind the
 * hover and definition dispatch lookups. Two other dispatch-aware call sites
 * bypass it: `references.ts` builds a tag-specific `is="..."` pattern, and
 * `usage-index.ts` reads dispatch sites off `findCottonTags()`.
 */
export function cottonComponentTagOpenRe(): RegExp {
    return /<c-component\b([\s\S]*?)>/g;
}

/**
 * Reference to a Cotton tag — either an opening `<c-NAME` or closing
 * `</c-NAME` lead-in, NOT requiring a closing `>`. Useful for semantic
 * tokens and rename-style scans where we colour the `c-NAME` identifier
 * regardless of attribute structure.
 *
 * Capture groups:
 *   [1] — `c-NAME` (the `c-` prefix is included so callers can highlight it).
 */
export function cottonTagReferenceRe(): RegExp {
    return /<\/?(c-[\w.-]+)/g;
}

/**
 * Opening `<c-vars ...>` tag (self-closing or not). `\b` blocks `<c-varsx>`;
 * the non-greedy body lets `\s*\/?` claim the self-closing slash. NOT global —
 * callers match the first declaration once. Group [1] = attribute body.
 */
export function cvarsOpenRe(): RegExp {
    return /<c-vars\b([^>]*?)\s*\/?>/i;
}

/**
 * The `<c-vars>` attribute reader used by `parser.ts` and by
 * `diagnostics/component-file-checks.ts` (whose quick-fix payloads come off
 * that same pass). NOT the only reader any more: the parity rules in
 * `diagnostics/rules/` read the same declaration with `scanTagAttributes()`
 * because only the scanner skips Django blocks — see `rules/_shared.ts`.
 * Keep the two in step, or a rule and the parser will disagree about what
 * the declaration says.
 *
 * Supersets django-cotton's runtime (`tag_parser.py`, the real source of
 * truth — not the gallery's double-quote-only `_ATTR`): single OR double
 * quotes, spaces around `=`, unquoted tokens, bare flags, optional `:` prefix.
 * The `[A-Za-z_]` name anchor stops an unquoted value (`count=3`) reading as a
 * phantom prop `3`.
 *
 * Groups: [1] name (incl `:`), [2] "value", [3] 'value', [4] unquoted.
 */
export function cvarsAttrRe(): RegExp {
    return /(:?[A-Za-z_][\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+)))?/g;
}

// ── Regex helpers ────────────────────────────────────────────────────────

/** Escape a string so it can be safely interpolated into a `new RegExp(...)`
 *  pattern. Use this whenever a user- or scanner-supplied tag/prop name has
 *  to be matched literally — dot, plus, etc. are all special otherwise. */
export function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
