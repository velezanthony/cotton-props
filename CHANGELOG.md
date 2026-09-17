# Change Log

All notable changes to the Cotton Props extension are documented here.

This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **A `<c-tag>` written inside a comment is no longer treated as a usage.** Prose mentioning a component — `{# la variable no se puede meter en el atributo del <c-...> #}`, an `<!-- ... -->` note, a `{% comment %}` block — produced real errors on a sentence. `<c-...>` in particular arrived as a component named `...`, because the tag pattern has to allow `.` for `atoms.button`. Annotation comments are the deliberate exception: `{# @prop ... | description:"usa <c-atoms.icon>" #}`, `{# @description ... #}` and `{# @trigger ... #}` are Cotton definitions, so a component named inside one is still resolved — you keep hover and go-to-definition there, and still get told when the docs name a component that no longer exists.
- **A malformed name is reported as malformed.** `<c-...>` now reads `'...' is not a valid component name` instead of `component '...' not found`, which suggested a missing file.
- **A `<c-vars>` written inside a comment no longer shadows the real declaration.** An example in a comment was taken for the declaration, so every parity check against the real one was silently skipped. `{% comment %}` blocks are now recognised as comments too, everywhere comments are blanked.


- **No more phantom props from attribute values.** Attributes are now read by a real scanner (`src/core/tag-scanner.ts`) instead of a regex, which fixes a family of false diagnostics where the contents of an attribute value were tokenized as if they were more attributes:
  - A `>` inside a value — an arrow function, `a > b`, `{% if a > b %}` — truncated the tag body and threw away the closing quote, so every identifier in an `x-data`-style expression became a prop (`Duplicate prop 'this'`).
  - Framework prefixes were unrecognised, so `@click="run('{{ a }}', '{{ b }}')"` and `::value="rows['k' + i]"` had their values walked into (`Duplicate prop 'option'`, `Duplicate prop 'p'`).
  - A Django `{# comment #}` inside a tag body was read as attributes, turning prose into props (`Duplicate prop 'de'`).
- **A phantom attribute can no longer silence a `Missing required prop` warning.** Only prop-shaped attributes count as "passed", so a stray token that happened to share a required prop's name no longer suppressed its warning — a false negative that hid real errors.
- **The rest of the providers stopped inheriting the same defect.** The scanner now backs every reader that had its own attribute regex:
  - **Hover** resolved prop names by scanning one line with an optional-value pattern, so an identifier inside a value offered that prop's docs (`x-data="{ title: 1 }"` on a component with a `title` prop), and a multi-line tag declaration resolved to nothing at all. Both fixed.
  - **The convert-to-dispatch refactor** located the tag head with a `[^>]*?` body, so a `>` in a value ended it early and the action was silently withheld for a cursor past that point.
  - **Dynamic-attribute decorations** were skipped for every `:prop` after a value containing `>`, and for any value holding the opposite quote character (`:label="it's"`). Alpine's `::class` is no longer tinted as a Cotton expression.
  - **`is=` stripping** left the attribute in place when its value contained the opposite quote character, producing a broken tag.
  - **The `<c-vars>` parity rules** (`enum-default-out-of-range`, `dynamic-prefix-mismatch`, `missing-cvars`) read only double-quoted or whitespace-free values, so `<c-vars label='choose size here'>` was walked into and its words became phantom attributes — reported whenever one happened to name another declared prop. A single-quoted default was also reported with its quotes included in the message. These now go through the shared scanner (`findCVarsBody()` + `scanTagAttributes()`), which reads both quote styles, keeps reading past a `>` inside a value, and skips a Django `{# comment #}` written inside the tag — finishing the unification that 1.0.0's c-vars fix intended but missed in two files.
- **Framework attributes are no longer mistaken for props.** `@click`, `::class`, and `x-on:click.away` are passed through by Cotton and are now excluded from prop checks, from `@strict` unknown-prop warnings, from inlay-hint suppression, and from signature-help parameter tracking.
- **The component tree filter no longer disappears when you click a component.** The filter is now view state that outlives the input box: closing the box by any means — `Enter`, `Esc`, or clicking the tree — keeps what is on screen. Previously the input box owned the filter and reverted it on any close it did not recognise as an accept, and since VS Code hides an input box on focus loss, clicking a filtered result silently wiped the filter.

### Changed

- **Diagnostics carry a source and a code.** The Problems panel renders the two together as `cotton-props(duplicate-usage-prop)`, so every finding says which extension produced it and which rule fired, and both are filterable. `Duplicate prop` and `Unknown prop` had codes defined but never assigned. Messages no longer repeat the extension's name, since the columns carry it.
- **Clearing the filter is always an explicit act** — the title-bar button, `Escape` with the component tree focused, or emptying the filter box. Nothing clears it behind your back.
- The filter box coalesces keystrokes (120 ms) so typing a word triggers one tree rebuild instead of one per character.
- **One canonical attribute reader.** Diagnostics, inlay hints, signature help, the detail-panel highlighter, and prop rename had each grown their own attribute regex, and each leaked differently. They now share `scanTagAttributes()` / `findCottonTags()`, so a parsing fix lands everywhere at once instead of in one provider.

## [1.0.0] — 2026-06-15

First public release — a complete IntelliSense, validation, and tooling suite for [Django Cotton](https://django-cotton.com/) components in VS Code.

### Autocomplete & hover

- **Tag, prop, and value completion** — components grouped by category with prop docs; props with type/default/required/deprecated badges; allowed values for `select` and `boolean` props.
- **Annotation snippets** — `@description`, `@prop` (text/number/boolean/select/required variants), `@slot`, `@slot:NAME`, `@trigger`, `@strict`.
- **Structured hover docs** — on a tag: description, prop table (type + default), slots, trigger HTML, and an `@strict` chip; on a prop: detail, description, and allowed values.

### Navigation & refactoring

- **Go to Definition**, **Find All References**, and **Outline** symbols for `@prop`/`@slot`/`@trigger`/`@strict`.
- **Rename prop** (F2) propagates across the `@prop` annotation, `<c-vars>`, the template body, and every usage file.
- **Auto-rename tag** — opening/closing pairs stay in sync as you type, bidirectionally and through nesting.
- **Dynamic tag dispatch** (`<c-component is="...">`) understood in all three forms — literal target (full resolution), prefix + interpolation (`is="icons.{{ name }}"`, prefix match), and pure expression (`:is="var"`, intentionally untracked). Multi-line tags work; file renames rewrite literal dispatch values; a refactor converts between direct and dispatch forms.

### Diagnostics (21 rules)

- **Component files** — duplicate `@prop`, `@prop` missing from `<c-vars>`, undocumented props, unused props, default mismatch, bare-attr default, `required` + `default` conflict, type-default mismatch, enum default out of range, dynamic-prefix mismatch, missing `<c-vars>`, missing description.
- **Usage files** — component not found, unknown prop (`@strict`), duplicate prop, deprecated prop, invalid type value, missing required prop, `<c-component>` without `is`.
- **Smart-skip** — type validation is never run on dynamic props (`:prop="var"`) or template expressions (`{{ }}` / `{% %}`).

### Quick fixes

- Document a prop (guessed type) or all missing props; add a required prop or all of them; add to `<c-vars>` (or all missing); sync a `<c-vars>` default; resolve a `required`/`default` conflict; replace an out-of-range value with a valid `<option>`; toggle the `:` dynamic prefix; insert a missing `<c-vars />`; add a missing `| description:""`.

### Sidebar & editor aids

- **Cotton Components explorer** — collapsible category tree with per-item diagnostic counts (`2E 1W`), unused (`U`) badges, and category-level aggregates.
- **Detail panel** — props table, slots, and syntax-highlighted component source (theme-aware).
- **Drag & drop** a component into the editor to paste a full usage block with every prop expanded as a tabstop and defaults pre-filled; plus copy-tag and in-tree search.
- **Signature help**, **inlay hints** (default values), **code lens** (usage counts), **folding** of annotation blocks, **semantic highlighting** of `@prop` annotations, and faded `{{ }}` hints on dynamic `:prop` values.
- **Commands** — Wrap with Component, Extract to Component, Find Extractable Patterns. Status bar shows the component count.

### Configuration

- `djangoCottonProps.templatePaths` — depth-agnostic, multi-app component discovery.
- `djangoCottonProps.excludePaths` — folders skipped entirely, dropped from both the component tree and the usage scan.
- `djangoCottonProps.inlayHints.showDefaults`, `djangoCottonProps.dynamicAttr.showExpressionHint`, `djangoCottonProps.diagnostics.missingDescription.severity`.
- All settings apply **live** — no window reload.

### Quality & security

- **585 automated tests** running in a real VS Code Extension Host.
- Path-traversal guard on Extract to Component; undoable file creation via `WorkspaceEdit`; a scripts-disabled detail webview with a strict Content-Security-Policy and full HTML escaping.
- Surgical sidebar refresh (no full rebuild per keystroke) and parallel-batched workspace scanning for fast activation on large projects.

### Requirements

- VS Code **1.97+**.
