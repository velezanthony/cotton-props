# Getting started

## Install

Search **Cotton Props** in the Extensions view, or:

```
ext install velezanthony.cotton-props
```

Requires VS Code **1.97+** and a [Django Cotton](https://django-cotton.com/)
project with component templates.

## First run

Open any `.html` or `django-html` template and type `<c-`. Completion, hover
documentation and diagnostics are live immediately — the default
`templates/cotton/` layout needs no configuration.

## If nothing appears

The extension finds components by scanning template directories. It looks under
`templates/cotton/` by default, at any depth, so a Django `APP_DIRS` layout with
per-app copies works without configuration.

If your components live elsewhere, point it at them:

```jsonc
{
  "djangoCottonProps.templatePaths": ["templates/cotton", "ui/components"]
}
```

`excludePaths` narrows the scan — it applies to component *definitions* as well
as usages, so a path excluded here makes its components invisible, not just
unreferenced.

Both settings apply live: change them and the tree, the diagnostics and the
status bar follow without a window reload.

## Documenting a component

The `@prop` annotation documents a prop; `<c-vars>` declares it for Cotton. Both
are needed, and the diagnostics exist to catch the moment they drift apart.

```html
{# @description A button. #}
{# @prop variant:select['primary','ghost'] | default:"primary" | description:"Visual style" #}
{# @prop label:text | required #}

<c-vars variant="primary" label />

<button class="btn btn-{{ variant }}">{{ label }}</button>
```

Every filter, every type, and the full `<c-vars>` contract are in the
[reference](../REFERENCE.md#prop-annotation-syntax).

## Reading a diagnostic

Findings carry a source and a code, rendered together in the Problems panel:

```
cotton-props(sync-default)
```

Type the code into the panel's filter box to isolate that rule, or
`cotton-props` to see only this extension's findings. Each code has its
own section in the [reference](../REFERENCE.md#diagnostic-rules), with the
smallest input that triggers it.
