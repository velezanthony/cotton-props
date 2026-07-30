import { findCottonTags, scanTagAttributes } from '../tag-scanner';

/** Offset range of a dynamic attribute's VALUE (the text inside the quotes,
 *  quotes excluded). */
export interface DynamicAttrValue {
    /** Offset of the first value character. */
    start: number;
    /** Offset one past the last value character. */
    end: number;
}

const INTERP_RE = /\{\{|\{%/;

/**
 * Find every dynamic `:attr="value"` value range on cotton tags in `text`.
 *
 * In Django Cotton a `:`-prefixed attribute is a Django EXPRESSION — its value
 * is evaluated, not taken literally. We can't resolve that expression (we don't
 * have Django's context), so we never validate it; we only locate it so callers
 * can mark it as dynamic (tint + ghost `{{ }}`).
 *
 * Values that already contain `{{`/`{%` are skipped — they're explicit
 * interpolation and adding faux braces would double up. Empty values are
 * skipped too (nothing to mark).
 */
export function findDynamicAttrValues(text: string): DynamicAttrValue[] {
    const out: DynamicAttrValue[] = [];
    for (const tag of findCottonTags(text)) {
        if (!tag.body.includes(':')) { continue; }

        for (const attr of scanTagAttributes(tag.body)) {
            // Cotton's `:prop` form only. Alpine's `::class` and `@click` are
            // framework attributes, not Cotton expressions, so tinting them
            // would claim Django evaluates something it never sees.
            if (attr.kind !== 'dynamic') { continue; }
            if (attr.value === undefined || attr.value.length === 0) { continue; }
            if (INTERP_RE.test(attr.value)) { continue; }

            const start = tag.bodyOffset + attr.valueOffset!;
            out.push({ start, end: start + attr.value.length });
        }
    }
    return out;
}
