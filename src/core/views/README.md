# `views/`

The sidebar: the component tree, its badges, and the detail webview.

## `component-tree.ts`

Builds an N-level trie from the dotted tags, so `atoms.forms.input` nests three
deep. A node can be both a folder and a component at once — Cotton's index
convention means `button/index.html` is `<c-button />`, so `button` may have
children *and* be a component itself.

The tag filter lives here, not in the input box that edits it. `matchesFilter`
compares against the **full dotted tag**, which is why both `atoms` and `button`
reach `atoms.button`. Keep it that way: matching only the row label would break
every dotted search.

`setFilter` triggers a full rebuild rather than a surgical refresh, because the
match set changes structurally and the cached items have to be re-walked.

## `tree-decorations.ts`

Badges hang off a `cotton:` URI scheme through `FileDecorationProvider`. That is
the only way to colour a tree row by severity — `TreeItem` has no API for it.

A component shows one number: the count of its highest severity present, capped
at `9+`. The full breakdown goes in the row description instead.

## `component-detail.ts` and `source-highlight.ts`

A webview and its highlighter. The highlighter is hand-rolled and dependency-free
because the grammar is small and bounded: three Django delimiters, HTML tag and
attribute pairs, and the annotation vocabulary.

It escapes everything it emits and runs with scripts disabled. Attribute spans
come from `scanTagAttributes`, so the panel classifies `:size` and `::class` the
same way the diagnostics do.

## Adding to the tree

Tree items are cached by full path in `_items`, which is what makes surgical
`fire(item)` refreshes possible — VS Code only updates items it issued. If you
add a new item type, it has to go in that cache or its refreshes will be silently
ignored.
