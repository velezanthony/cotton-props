# Reference

The complete rule catalogue, annotation grammar and settings for
[Django Cotton Props](https://marketplace.visualstudio.com/items?itemName=velezanthony.django-cotton-props).
The README is the tour; this is the thing you search when a code shows up in
the Problems panel.

## Prop annotation syntax

The `@prop` annotation documents a prop; `<c-vars>` declares it for Cotton. They must stay in sync — the diagnostics exist to catch the moment they drift.

```html
{# @description One-line summary shown on hover. #}
{# @prop variant:select['primary', 'secondary', 'danger'] | default:"primary" | description:"Style variant" #}
{# @prop loading:boolean | default:False | description:"Show loading spinner" #}
{# @prop :count:number | default:0 | description:"Badge count (dynamic)" #}
{# @prop lat:text | description:"Latitude" | required #}
{# @prop old-api:text | deprecated:"Use new-api" | hidden #}
{# @slot:header — Header slot for custom content. #}
{# @trigger <button>Open</button> — Trigger element #}
{# @strict #}
```

<details>
<summary><strong>Filters, types & dynamic props</strong> — full reference</summary>

**Filters**

| Filter | Example | Description |
|--------|---------|-------------|
| `default` | `\| default:"primary"` | Default value (strings quoted, numbers/booleans unquoted) |
| `description` | `\| description:"Style"` | Prop description |
| `required` | `\| required` | Prop is mandatory (no default allowed) |
| `deprecated` | `\| deprecated:"Use X"` | Marks prop as deprecated |
| `hidden` | `\| hidden` | Hides from autocomplete and gallery |
| `example` | `\| example:"bg-brand"` | Example value shown in hover docs |

**Types**

| Type | Gallery control | Example |
|------|-----------------|---------|
| `text` | Text input | `name:text \| default:"Hello"` |
| `number` | Number input | `:count:number \| default:0` |
| `boolean` | Toggle | `loading:boolean \| default:False` |
| `select` | Dropdown | `size:select['sm', 'md', 'lg'] \| default:"md"` |

**Dynamic props (`:` prefix)** — prefix with `:` when the value is a Django expression (list, dict, variable). The `:` must match between `@prop` and `<c-vars>`:

```html
{# @prop :count:number | default:5 | description:"Badge count" #}
<c-vars :count="5" />
```

</details>

<details>
<summary><strong>Real-world component examples</strong> — badge, alert, input group</summary>

**Atom — badge with dynamic count:**

```html
{# @prop :count:number | default:0 | description:"Number to display" #}
{# @prop :max:number | default:99 | description:"Maximum before showing max+" #}
<c-vars :count="0" :max="99" />

{% if count and count > 0 %}
  <span class="inline-flex items-center justify-center px-1 text-xs font-bold text-white bg-danger-500 rounded-full">
    {% if count > max %}{{ max }}+{% else %}{{ count }}{% endif %}
  </span>
{% endif %}
```

**Atom — alert with boolean and select:**

```html
{# @prop variant:select['info', 'success', 'warning', 'danger'] | default:"info" | description:"Alert style" #}
{# @prop dismissible:boolean | default:False | description:"Show close button" #}
<c-vars variant="info" dismissible=False />

<div class="p-4 rounded-lg bg-{{ variant }}-50 text-{{ variant }}-700" role="alert">
  {{ slot }}
  {% if dismissible is True %}
    <button type="button" class="float-right">&times;</button>
  {% endif %}
</div>
```

**Molecule — input group with attrs pass-through:**

```html
{# @prop label:text | description:"Field label" #}
{# @prop errors:text | description:"Validation errors" #}
{# @prop required:boolean | default:False | description:"Required indicator" #}
<c-vars label errors required=False />

<div class="mb-4">
  {% if label %}
    <c-atoms.label :required="required">{{ label }}</c-atoms.label>
  {% endif %}
  <c-atoms.input :attrs="attrs" />
  <c-atoms.field-error :errors="errors" />
</div>
```

Usage — `name`, `placeholder`, `type` pass through via `attrs`:

```html
<c-molecules.input-group label="Email" name="email" type="email" placeholder="you@example.com" required />
```

</details>

## Diagnostic rules

Every diagnostic this extension reports carries a **source** and a **code**, which the Problems panel renders together:

```
django-cotton-props(duplicate-usage-prop)
```

Type a code into the panel's filter box to isolate one rule, or `django-cotton-props` to see only this extension's findings.

Rules are split by where they fire. **Definition rules** run inside a component's own template — the file under `templates/cotton/` that declares `@prop` annotations and a `<c-vars>` tag. **Usage rules** run wherever a component is written, in any template.

> Examples below are minimal: each is the smallest input that triggers the rule.

### Definition rules

These check that a component's `@prop` annotations and its `<c-vars>` declaration agree with each other.

#### `duplicate-prop`

**Severity:** Error · **Quick fix:** no

> `Duplicate @prop definition 'NAME'`

```django
{# @prop title:text #}
{# @prop title:text #}
<c-vars title="x">
```

**Why it matters:** Only one of the two survives parsing, and which one is an accident of order. The loser is usually the line you just edited, so the documentation stops matching the component without anything appearing to change.

#### `missing-from-cvars`

**Severity:** Warning · **Quick fix:** yes — adds the attribute to `<c-vars>`

> `@prop 'NAME' is defined but missing from <c-vars>`
> `@prop 'NAME' defines default 'X' but is missing from <c-vars>`

```django
{# @prop title:text #}
{# @prop other:text #}
<c-vars other="x">
```

**Why it matters:** The `@prop` is documentation; `<c-vars>` is what Cotton actually reads. A prop documented but not declared is never passed, so the template renders a blank where the value should be — and the docs say it works.

#### `sync-default`

**Severity:** Information for the two one-sided cases, Warning when both sides disagree · **Quick fix:** yes, except for the `<c-vars>`-has-a-default-the-`@prop`-does-not variant, which reports only

Three variants, all meaning "`@prop` and `<c-vars>` disagree about a default":

> `@prop defines default 'X' for 'NAME' but <c-vars> has no value`
> `'NAME' has default 'X' in <c-vars> but @prop doesn't document a default`
> `Default mismatch for 'NAME': @prop says 'X' but <c-vars> has 'Y'`

```django
{# @prop title:text | default:"a" #}
<c-vars title="b">
```

**Why it matters:** Cotton uses the `<c-vars>` value. The component behaves one way while its documentation promises another, and anyone reading the `@prop` to learn what it does is reading a lie.

#### `undocumented-prop`

**Severity:** Information · **Quick fix:** yes — inserts the `@prop` line

> `'NAME' is not documented. Add: …`

```django
{# @prop title:text #}
<c-vars title="a" undocumented="b">
```

**Why it matters:** The prop works — it simply has no description, no type and no default on record. Autocomplete and hover have nothing to offer, so callers guess.

#### `unused-prop`

**Severity:** Warning · **Quick fix:** no

> `'NAME' is defined in <c-vars> but never used in the template`

```django
{# @prop title:text #}
<c-vars title="a">
<div>nothing references it</div>
```

**Why it matters:** Either the template forgot to use it, or the prop outlived its purpose. Both are worth knowing: the first is a bug, the second is dead weight every caller still has to reason about.

#### `missing-cvars-tag`

**Severity:** Warning · **Quick fix:** yes — inserts an empty `<c-vars>`

> `Component declares @prop annotations but has no <c-vars> tag — Cotton won't pass anything to the template.`

```django
{# @prop title:text #}
<div>no c-vars anywhere</div>
```

**Why it matters:** Without `<c-vars>` Cotton passes nothing at all. Every prop renders empty, and because nothing errors it reads as a styling problem rather than a missing declaration.

#### `missing-prop-description`

**Severity:** Hint by default — configurable via `djangoCottonProps.diagnostics.missingDescription.severity` (`hint` / `warning` / `off`) · **Quick fix:** yes

> `'NAME': @prop has no '| description:' filter.`

```django
{# @prop title:text #}
<c-vars title="a">
```

**Why it matters:** The description is what hover and autocomplete show. Without it a caller sees a name and a type and has to open the component to find out what it means.

#### `required-with-default-conflict`

**Severity:** Error · **Quick fix:** yes

> `'NAME': cannot use '| required' with '| default:' — a required prop has no fallback. The parser will silently drop 'required'.`

```django
{# @prop title:text | required | default:"x" #}
```

**Why it matters:** The parser drops `required` and keeps the default, so the prop stops being required — silently, and in the opposite direction from what the annotation says. Nothing warns at runtime; callers just stop being told they forgot it.

#### `type-default-mismatch`

**Severity:** Error · **Quick fix:** no

> `'NAME': type is 'boolean' but default 'X' is not a recognised boolean (use True/False/1/0).`
> `'NAME': type is 'number' but default 'X' is not a valid number.`

```django
{# @prop loading:boolean | default:"yes" #}
```

**Why it matters:** The declared type drives validation of every call site, so a default that contradicts it makes the component fail its own rule. Callers get errors for copying the documented default.

#### `enum-default-out-of-range`

**Severity:** Error · **Quick fix:** yes — one action per allowed option

> `'NAME': @prop default 'X' is not in options [a, b].`
> `'NAME': <c-vars> value 'X' is not in options [a, b].`

```django
{# @prop variant:select['a','b'] | default:"z" #}
```

**Why it matters:** The option list is the contract. A default outside it means the component ships in a state it declares invalid, and every caller that relies on the default inherits it.

#### `dynamic-prefix-mismatch`

**Severity:** Error · **Quick fix:** yes — toggles the `:` prefix

> `'NAME': ':' prefix mismatch — @prop is ':NAME' but <c-vars> has 'NAME'.`

```django
{# @prop :size:text #}
<c-vars size="md">
```

**Why it matters:** The `:` is not cosmetic: it makes Cotton evaluate the value as a Django expression instead of passing a string. The two sides disagreeing means the documentation and the runtime are passing different things.

### Usage rules

These check the tags you write, wherever you write them.

#### `component-not-found`

**Severity:** Error · **Quick fix:** no

> `component 'NAME' not found`

```django
<c-atoms.does-not-exist />
```

Also fires on a `<c-component is="…">` dispatch whose literal target does not resolve.

**Why it matters:** The tag renders as nothing. Cotton does not raise, so a typo in a component name looks like a CSS problem or an empty queryset until someone reads the template closely.

#### `invalid-tag-name`

**Severity:** Error · **Quick fix:** no

> `'NAME' is not a valid component name — expected segments like 'button' or 'atoms.button'`

```django
<c-...>
```

Distinct from `component-not-found`: the name could never resolve to any file, whereas "not found" means a well-formed name with no matching template.

**Why it matters:** Usually prose, not code — `<c-...>` inside a sentence. Reporting it as a missing component would be a false positive on an ellipsis, so it gets its own code and its own message.

#### `missing-required`

**Severity:** Warning · **Quick fix:** yes — inserts the missing attribute

> `Missing required prop 'NAME' on 'TAG'`

```django
{# in the component: {# @prop title:text | required #} #}
<c-atoms.card />
```

**Why it matters:** `required` is the component's statement that it cannot do its job without the value. The call site gets an empty string instead, which usually surfaces much later and somewhere else.

#### `invalid-value`

**Severity:** Error · **Quick fix:** no

Three variants, one per constrained type:

> `Invalid value 'X' for 'NAME'. Expected: a, b`
> `Invalid boolean 'X' for 'NAME'. Expected: True or False`
> `Invalid number 'X' for 'NAME'`

```django
{# in the component: {# @prop variant:select['a','b'] #} #}
<c-atoms.card variant="zzz" />
```

Values containing `{{ }}` or `{% %}`, and `:`-prefixed expression attributes, are never checked — the extension cannot evaluate Django.

**Why it matters:** The type constrains what the component can handle. A value outside it reaches the template anyway — `variant="zzz"` becomes a class name that matches no CSS, and the element renders unstyled rather than failing.

#### `duplicate-usage-prop`

**Severity:** Error · **Quick fix:** no

> `Duplicate prop 'NAME' on 'TAG'`

```django
<c-atoms.card size="md" size="lg" />
```

`size` and `:size` collide, because Cotton treats them as the same prop. Framework attributes (`@click`, `::class`) are keyed separately, so `@click` never collides with a prop called `click`.

**Why it matters:** Cotton keeps one of them and the other is discarded, so the tag behaves differently from how it reads. `size` and `:size` collide for the same reason: to Cotton they are one prop.

#### `unknown-prop`

**Severity:** Warning · **Quick fix:** no · **Only in `@strict` components**

> `Unknown prop 'NAME' on 'TAG' (@strict mode)`

```django
{# in the component: {# @strict #} #}
<c-atoms.card nonsense="x" />
```

**Why it matters:** `@strict` is the component declaring that its prop list is exhaustive. An unknown name there is almost always a typo, and without the check it is passed through and silently ignored.

#### `deprecated-prop`

**Severity:** Hint, rendered with a strikethrough · **Quick fix:** no

> `Deprecated prop 'NAME' on 'TAG'`
> `Deprecated prop 'NAME' on 'TAG': REASON`

```django
{# in the component: {# @prop old:text | deprecated:"use 'new' instead" #} #}
<c-atoms.card old="x" />
```

**Why it matters:** It still works, which is the problem — nothing forces the migration, so the prop accumulates call sites until removing it becomes a project-wide change.

#### `missing-is-attribute`

**Severity:** Error · **Quick fix:** no

> `<c-component> requires an 'is' (or ':is') attribute`

```django
<c-component />
```

**Why it matters:** `<c-component>` is a dispatcher with nothing to dispatch to. It fails at Cotton runtime, not at edit time, so the template looks fine until the page is rendered.

### What is never checked

Deliberate blind spots, so a rule firing there would be a bug:

- **Anything inside a comment.** `{# … #}`, `<!-- … -->` and `{% comment %}` blocks are prose. A `<c-tag>` written in one is not a usage. The exception is annotation comments — `{# @prop … #}`, `{# @description … #}`, `{# @trigger … #}` — which are Cotton definitions, so a component named inside one is still resolved.
- **The contents of an attribute value.** Whatever lives inside `x-data="…"`, `@click="…"` or `::value="…"` is JavaScript or a Django expression, never more attributes.
- **Framework attributes.** `@click`, `::class`, `x-on:click.away` are passed through by Cotton and are never treated as declared props.
- **Django expressions.** A value containing `{{ }}` or `{% %}`, and any `:`-prefixed attribute, is evaluated by Django at render time. The extension has no context to resolve it, so it never validates it.


## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `djangoCottonProps.templatePaths` | `["templates/cotton"]` | Path suffixes scanned for component **definitions**, matched at any depth (root + every Django app). Applies live. |
| `djangoCottonProps.excludePaths` | `["node_modules", "dist", "build", "venv", "__pycache__", "coverage", ".*"]` | Folders skipped when scanning the workspace — both where components are **defined** (they drop out of the tree, e.g. `templates/cotton/icons`) and where they are **used**. `.*` matches any dot-directory. Applies live. |
| `djangoCottonProps.inlayHints.showDefaults` | `true` | Show default values as inlay hints for unset props. |
| `djangoCottonProps.dynamicAttr.showExpressionHint` | `true` | Render faded `{{ }}` braces around dynamic `:prop="…"` values. |
| `djangoCottonProps.diagnostics.missingDescription.severity` | `"hint"` | Severity for the *missing prop description* diagnostic — `hint`, `warning`, or `off`. |

<details>
<summary><strong>📋 Copy-paste <code>settings.json</code></strong> — all values at their defaults</summary>

```jsonc
{
  // Where component definitions live — path suffixes, matched at any depth.
  "djangoCottonProps.templatePaths": ["templates/cotton"],

  // Folders skipped when scanning the workspace — both where components are defined (they drop out of the tree) and where they are used.
  "djangoCottonProps.excludePaths": ["node_modules", "dist", "build", "venv", "__pycache__", "coverage", ".*"],

  // Show default values as inlay hints for unset props.
  "djangoCottonProps.inlayHints.showDefaults": true,

  // Render faded {{ }} braces around dynamic :prop="…" values.
  "djangoCottonProps.dynamicAttr.showExpressionHint": true,

  // Severity for the "missing prop description" diagnostic: "hint" | "warning" | "off".
  "djangoCottonProps.diagnostics.missingDescription.severity": "hint"
}
```

</details>
