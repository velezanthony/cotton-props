# `providers/`

The VS Code surface. Each file registers one language feature and stays thin:
locate the tag under the cursor, resolve it to a file, read the parsed
component, present.

The interesting logic belongs in the core. A provider that grows its own parsing
is the smell this codebase has already been bitten by — every one of them once
had a private attribute regex, and every one of those eventually walked into an
attribute value and tokenised its contents as more attributes.

## The shape they share

```ts
const tag = findTagContext(document, offset);        // which tag am I in?
const filePath = findComponentFile(tag);             // scanner.ts
const props = getCachedProps(filePath);              // scanner.ts, cached
// …present
```

Anything that needs to read a `<c-...>` tag or its attributes goes through
`tag-scanner.ts`. Nothing here should contain a regex matching `<c-`.

## Offsets

The core speaks offsets; VS Code speaks `Position`. Convert at the boundary —
inside a provider, as late as possible — and never carry line/column into a
helper. Line arithmetic breaks the moment a tag is declared across several
lines, which is the defect `findPropNameAt` was extracted to fix.

`TagAttribute` reports `nameOffset` and `valueOffset` relative to the tag body,
so a provider adds `tag.bodyOffset` and nothing else. If you find yourself
computing a position by summing match lengths, the scanner already has it.

## `diagnostics/`

The largest subtree, split by where a rule fires:

- `component-file-checks.ts` — inside a component's own template
- `usage-checks.ts` — wherever a component is written
- `rules/` — the parity checks comparing `@prop` against `<c-vars>`

Every diagnostic carries a `source` and a `code` from `DIAG_CODE`, and every
code needs a section in `docs/REFERENCE.md`. A test enforces that in both
directions.

Framework attributes (`@click`, `::class`, `x-on:`, `hx-`, `v-`) are excluded
from prop-facing checks. They are not props being passed, so they must neither
be reported as unknown nor satisfy a required one.
