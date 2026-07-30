/**
 * Helpers and regex constants used by more than one parity rule. Per-rule
 * patterns stay inside their own file — only what is referenced from multiple
 * rules lives here.
 */

import { findTagEnd } from '../../../tag-scanner';
import { blankComments } from '../../../parser';

/** `<c-vars` head. Case-insensitive because `cvarsOpenRe()` in regex.ts is too —
 *  `parser.ts` accepts `<C-VARS>`, so these rules must see the same declaration
 *  the parser does, or missing-cvars reports one that demonstrably exists. */
const CVARS_HEAD_RE = /<c-vars\b/i;

/** The `<c-vars>` declaration's attribute body, used by enum-default,
 *  missing-cvars, and dynamic-prefix for cross-checks against `@prop`.
 *
 *  Goes through the shared tag scanner rather than a `<c-vars\b([^>]*?)...>`
 *  regex: that pattern ended the tag at the first `>`, so a default holding one
 *  (`<c-vars hint="a > b" variant="zzz">`) lost every attribute after it and the
 *  rules stopped checking them. */
export function findCVarsBody(text: string): { body: string; bodyOffset: number } | undefined {
    // Locate the head in a comment-blanked copy so an example written inside a
    // comment cannot be taken for the declaration and hide the real one — the
    // same guard parser.ts and component-file-checks.ts already apply. Blanking
    // preserves offsets, so the body is still read from the original text.
    // Annotation comments are blanked here too: `{# @prop ... #}` is a
    // definition, but a `<c-vars>` written inside one is documentation.
    const head = CVARS_HEAD_RE.exec(blankComments(text));
    if (!head) { return undefined; }
    const bodyOffset = head.index + head[0].length;
    const end = findTagEnd(text, bodyOffset);
    if (!end) { return undefined; }
    return { body: text.substring(bodyOffset, end.bodyEnd), bodyOffset };
}

/** `| default:"..."` or `| default:literal` — captures the value in
 *  group 1 (quoted) or 2 (bare). Used by type-default-mismatch and
 *  enum-default-out-of-range. */
export const RAW_DEFAULT_RE = /\|\s*default\s*:\s*(?:"([^"]*)"|(\S+))/;

/** `[:?]NAME:` — captures the optional dynamic prefix and the clean
 *  name. Used by missing-description and dynamic-prefix-mismatch. */
export const HEAD_DYNAMIC_RE = /^\s*(:?)([\w-]+):/;
