/**
 * Helpers and regex constants used by more than one parity rule. Per-rule
 * patterns stay inside their own file — only what is referenced from multiple
 * rules lives here.
 */

import { findCottonTags } from '../../../tag-scanner';

/** The `<c-vars>` declaration's attribute body, used by enum-default,
 *  missing-cvars, and dynamic-prefix for cross-checks against `@prop`.
 *
 *  Goes through the shared tag scanner rather than a `<c-vars\b([^>]*?)...>`
 *  regex: that pattern ended the tag at the first `>`, so a default holding one
 *  (`<c-vars hint="a > b" variant="zzz">`) lost every attribute after it and the
 *  rules stopped checking them. */
export function findCVarsBody(text: string): { body: string; bodyOffset: number } | undefined {
    // Case-insensitive on the name to match the `/i` the previous pattern used.
    const tag = findCottonTags(text).find(t => t.name.toLowerCase() === 'vars');
    return tag ? { body: tag.body, bodyOffset: tag.bodyOffset } : undefined;
}

/** `| default:"..."` or `| default:literal` — captures the value in
 *  group 1 (quoted) or 2 (bare). Used by type-default-mismatch and
 *  enum-default-out-of-range. */
export const RAW_DEFAULT_RE = /\|\s*default\s*:\s*(?:"([^"]*)"|(\S+))/;

/** `[:?]NAME:` — captures the optional dynamic prefix and the clean
 *  name. Used by missing-description and dynamic-prefix-mismatch. */
export const HEAD_DYNAMIC_RE = /^\s*(:?)([\w-]+):/;
