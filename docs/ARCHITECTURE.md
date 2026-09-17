# Architecture

How the extension is put together, and why it is put together that way. Written
for someone about to change it.

## The shape

Everything hangs off one question: *what props does `<c-atoms.button>` accept?*
Answering it needs two things — a map from tag name to file, and a parse of that
file's annotations. Every feature is a different presentation of those two
answers.

```
                      extension.ts
                   (wiring, nothing else)
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   providers/            views/            commands/
   language features    sidebar            refactors
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
       scanner.ts      parser.ts      tag-scanner.ts
       tag → file      @prop/<c-vars>  reading a tag
       + cache         → PropDefinition  in a template
```

`constants.ts` and `scanner.ts` are each imported by most of the tree. That is
the architecture: wide and shallow over a narrow core, not a chain of layers.

## The core

### `scanner.ts` — where components live

Owns the map from tag name to file path, and the cache over it.

`scanComponents()` is synchronous and cache-backed because providers are called
on the UI thread and cannot await. `prewarmScanCache()` fills that cache at
activation and after every disk or config change, so the synchronous path is
normally hot.

`filePathToTag()` is the single definition of how a path becomes a tag, and it
is where Cotton's index convention lives: `card/index.html` is `<c-card />`, not
`<c-card.index />`. Both the sync walk and the async prewarm go through it, so
they cannot disagree.

### `parser.ts` — what a component declares

Turns a component file into `PropDefinition[]` plus its description, slots and
trigger. Two sources have to agree: the `{# @prop #}` annotations and the
`<c-vars>` tag. The parser reads both; the diagnostics exist to report when they
drift.

`blankComments()` is the part worth knowing about. Prose mentioning `<c-vars>`
inside a `{# #}` or `{% comment %}` would otherwise shadow the real declaration,
so comment bodies are blanked to spaces — same length, newlines kept, so every
offset still indexes into the original text.

### `tag-scanner.ts` — reading a tag in a template

The canonical reader for `<c-...>` and its attributes. It exists because a regex
has no memory of whether it is inside an attribute value: a `>` in
`on="a > b"` ends the tag early, `[^"']*` matches nothing against the opposite
quote, and `{# prose #}` in a tag body reads as a list of attributes.

Every one of those produced a phantom attribute, and a phantom that happened to
share a required prop's name suppressed that prop's warning — so the failure was
silent, and looked like a clean file.

- `findTagEnd()` walks to the closing `>`, stepping over quoted values and
  Django blocks. It returns `-1` for an unterminated tag rather than the end of
  the document, because the tolerant-looking answer hands the caller a body made
  of the rest of the file.
- `scanTagAttributes()` consumes each value as one unit and classifies
  attributes as `static`, `dynamic` or `framework`. `::class` is Alpine, not a
  Cotton expression, which is why `::` is tested before `:`.
- `findCottonTags()` owns the comment skip. It lives there rather than in each
  caller because asking ten call sites to remember to blank comments first is
  how the drift this module replaced began. Annotation comments are the
  deliberate exception: a component named in a `{# @description #}` is a real
  reference.

### `usage-index.ts` — who uses what

A reverse index from tag to the files referencing it, kept incrementally on
save. It powers Find All References, the CodeLens counts, the `unused` badge and
the project-wide rename.

It also resolves `<c-component is="...">` dispatch: a literal target counts as a
direct use, `icons.{{ name }}` registers a prefix so every `icons.*` component
counts as referenced, and `:is="var"` is unresolvable and deliberately
unrecorded.

The full scan opens files through `openTextDocument` rather than `fs.readFile`
on purpose — it populates VS Code's text-model cache, which is what lets
symbols, definition and references answer against templates the user never
opened.

## The edges

### `providers/` — 21 language features

Each one is a thin VS Code adapter over the core. They share the same shape:
locate the tag under the cursor, resolve it to a file, read the parsed
component, present. The interesting logic is in the core; a provider that grows
its own parsing is the smell this codebase has already been bitten by.

`diagnostics/` is the largest and splits by where a rule fires:
`component-file-checks.ts` runs inside a component's own template,
`usage-checks.ts` wherever a component is written, and `rules/` holds the parity
checks that compare `@prop` against `<c-vars>`.

Every diagnostic carries a `source` and a `code` from `DIAG_CODE`, so the
Problems panel renders `cotton-props(duplicate-usage-prop)` and the
filter box can isolate one rule. Those codes are documented one section each in
[REFERENCE.md](REFERENCE.md), and a test fails if a code has no section or a
section names a code that no longer exists.

### `views/` — the sidebar

`component-tree.ts` builds an N-level trie from the dotted tags, so
`atoms.forms.input` nests three deep. `tree-decorations.ts` hangs badges off a
`cotton:` URI scheme. `component-detail.ts` is a webview; `source-highlight.ts`
is its hand-rolled highlighter, dep-free because the grammar is small and
bounded.

### `commands/` — refactors

Wrap with Component, Extract to Component, and Find Extractable Patterns. These
write to the document, which puts them in a different risk class from everything
else: a provider that reports a wrong answer is annoying, a refactor that writes
a wrong answer costs the user a revert.

## Where does my change go?

| You are changing | It goes in | Because |
|---|---|---|
| how a tag or attribute is *read* | `tag-scanner.ts` | one canonical reader; a second one drifts |
| what a component *declares* | `parser.ts` | `@prop` and `<c-vars>` are parsed in one place |
| where a component *lives* | `scanner.ts` | `filePathToTag` is the only path→tag definition |
| what a diagnostic *reports* | `providers/diagnostics/` | and a section in [REFERENCE.md](REFERENCE.md), or a test fails |
| how something is *presented* | the provider or view | adapters stay thin |
| a refactor that *writes* | `commands/` | a different risk class — see below |

If your change needs a new way to read `<c-...>`, it does not. Extend
`tag-scanner.ts` or use `findTagEnd`, which is exported for exactly the caller
that needs its own head pattern.

## Hard rules

These are enforced, not suggested. The enforcement is named so you know what
will stop you.

**Every diagnostic has a documented code.** `DIAG_CODE` drives the Problems
panel filter, and `diagnostic-metadata.test.ts` fails if a code has no section
in `docs/REFERENCE.md` — or if a section names a code that no longer exists.

**Every published page is watched by CI.** `docs-workflow.test.ts` compares the
mkdocs nav against the workflow's `paths:` filter. A page outside it merges
cleanly and the site silently stops updating.

**Regex factories, never shared constants.** A `/g` regex carries mutable
`lastIndex`; a shared instance lets one caller's iteration corrupt another's.

**Framework attributes are not props.** `@click`, `::class`, `x-on:`, `hx-` and
`v-` belong to Alpine, HTMX and Vue. Django never sees them, so they are neither
reported as unknown props nor allowed to satisfy a required one. `::` is tested
before `:` for this reason — reordering that array breaks Alpine silently.

**Writes are a different risk class.** A provider reporting a wrong answer is
annoying; a refactor writing a wrong answer costs the user a revert. Commands in
`commands/`, `refactor.ts` and `rename-prop.ts` get the paranoid review.

## Conventions that are load-bearing

**Regex factories, never shared constants.** A `/g` regex carries mutable
`lastIndex`, so a shared instance lets one caller's iteration corrupt another's
cursor. `regex.ts` hands out a fresh instance per call.

**One canonical reader per question.** Two readers of the same syntax drift, and
the drift is invisible until a specific input hits only one of them. That is the
whole reason `tag-scanner.ts` exists, and why `findTagEnd` is exported for the
one caller that needs its own head pattern.

**Offsets, not line/column, inside the core.** Line arithmetic breaks on
multi-line tags. Providers convert to `Position` at the VS Code boundary and
nowhere else.

## Registration order is load-bearing

`extension.ts` builds things in a fixed order, and two dependencies are real
rather than stylistic:

- The **usage index is created first**, because the references provider, the
  CodeLens counts and the tree's `unused` badge all hold a reference to it.
- The **tree view is created before the commands that drive it**, since the
  filter commands close over `treeView` to set its description and message.

The filter itself is owned by the tree provider, not by the input box. That is
the fix for a real bug: VS Code auto-hides an input box on focus loss, so a box
that owned the filter wiped it when you clicked the component you had just
filtered for.

## Testing

The suite runs in a real VS Code instance against the Django project fixture in
`test-django-cotton/`. That costs a download and about a minute per run, and it
buys tests that exercise the actual extension host rather than a mock of it.

Pure logic is tested pure: `findPropNameAt`, `matchesFilter`, `scanTagAttributes`
and the parity rules take text and return values, with no workspace involved.
Prefer that shape — a test that opens a document to check offset arithmetic is
testing VS Code.

See [testing](contributors/testing.md) for how to run it, and the trap that
costs everyone an hour the first time.
