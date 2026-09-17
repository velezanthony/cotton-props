# Referencia

El catálogo completo de reglas, la gramática de anotaciones y los ajustes de
[Cotton Props](https://marketplace.visualstudio.com/items?itemName=velezanthony.cotton-props).
El README es la visita guiada; esto es lo que buscas cuando te sale un código en
el panel de Problems.

## Sintaxis de anotaciones

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

## Reglas de diagnóstico

Cada diagnóstico que reporta la extensión lleva un **origen** y un **código**, que el panel de Problems muestra juntos:

```
cotton-props(duplicate-usage-prop)
```

Escribe un código en la caja de filtro del panel para aislar una regla, o `cotton-props` para ver solo lo de esta extensión.

Las reglas se reparten según dónde disparan. Las **de definición** corren dentro de la plantilla del propio componente — el fichero bajo `templates/cotton/` que declara las anotaciones `@prop` y el tag `<c-vars>`. Las **de uso** corren allá donde se escriba un componente, en cualquier plantilla.

> Los ejemplos son mínimos: cada uno es la entrada más pequeña que dispara la regla.

### Reglas de definición

Comprueban que las anotaciones `@prop` de un componente y su declaración `<c-vars>` coinciden entre sí.

#### `duplicate-prop`

**Severidad:** Error · **Quick fix:** no

> `Duplicate @prop definition 'NAME'`

```django
{# @prop title:text #}
{# @prop title:text #}
<c-vars title="x">
```

**Por qué importa:** Solo una de las dos sobrevive al parseo, y cuál es un accidente del orden. La que pierde suele ser la línea que acabas de editar, así que la documentación deja de coincidir con el componente sin que nada parezca haber cambiado.

#### `missing-from-cvars`

**Severidad:** Warning · **Quick fix:** sí — adds the attribute to `<c-vars>`

> `@prop 'NAME' is defined but missing from <c-vars>`
> `@prop 'NAME' defines default 'X' but is missing from <c-vars>`

```django
{# @prop title:text #}
{# @prop other:text #}
<c-vars other="x">
```

**Por qué importa:** El `@prop` es documentación; `<c-vars>` es lo que Cotton lee de verdad. Una prop documentada pero no declarada no se pasa nunca, así que la plantilla renderiza un hueco donde debería ir el valor — y la documentación dice que funciona.

#### `sync-default`

**Severidad:** Information for the two one-sided cases, Warning when both sides disagree · **Quick fix:** sí, except for the `<c-vars>`-has-a-default-the-`@prop`-does-not variant, which reports only

Three variants, all meaning "`@prop` and `<c-vars>` disagree about a default":

> `@prop defines default 'X' for 'NAME' but <c-vars> has no value`
> `'NAME' has default 'X' in <c-vars> but @prop doesn't document a default`
> `Default mismatch for 'NAME': @prop says 'X' but <c-vars> has 'Y'`

```django
{# @prop title:text | default:"a" #}
<c-vars title="b">
```

**Por qué importa:** Cotton usa el valor de `<c-vars>`. El componente se comporta de una forma mientras su documentación promete otra, y quien lea el `@prop` para saber qué hace está leyendo una mentira.

#### `undocumented-prop`

**Severidad:** Information · **Quick fix:** sí — inserts the `@prop` line

> `'NAME' is not documented. Add: …`

```django
{# @prop title:text #}
<c-vars title="a" undocumented="b">
```

**Por qué importa:** La prop funciona — simplemente no consta su descripción, ni su tipo, ni su default. El autocompletado y el hover no tienen nada que ofrecer, así que quien la usa adivina.

#### `unused-prop`

**Severidad:** Warning · **Quick fix:** no

> `'NAME' is defined in <c-vars> but never used in the template`

```django
{# @prop title:text #}
<c-vars title="a">
<div>nothing references it</div>
```

**Por qué importa:** O la plantilla se olvidó de usarla, o la prop sobrevivió a su propósito. Las dos cosas conviene saberlas: la primera es un bug, la segunda es peso muerto sobre el que cada llamante sigue teniendo que pensar.

#### `missing-cvars-tag`

**Severidad:** Warning · **Quick fix:** sí — inserts an empty `<c-vars>`

> `Component declares @prop annotations but has no <c-vars> tag — Cotton won't pass anything to the template.`

```django
{# @prop title:text #}
<div>no c-vars anywhere</div>
```

**Por qué importa:** Sin `<c-vars>`, Cotton no pasa absolutamente nada. Todas las props renderizan vacías y, como no falla nada, parece un problema de estilos en vez de una declaración que falta.

#### `missing-prop-description`

**Severidad:** Hint by default — configurable via `djangoCottonProps.diagnostics.missingDescription.severity` (`hint` / `warning` / `off`) · **Quick fix:** sí

> `'NAME': @prop has no '| description:' filter.`

```django
{# @prop title:text #}
<c-vars title="a">
```

**Por qué importa:** La descripción es lo que muestran el hover y el autocompletado. Sin ella, quien usa la prop ve un nombre y un tipo, y tiene que abrir el componente para saber qué significa.

#### `required-with-default-conflict`

**Severidad:** Error · **Quick fix:** sí

> `'NAME': cannot use '| required' with '| default:' — a required prop has no fallback. The parser will silently drop 'required'.`

```django
{# @prop title:text | required | default:"x" #}
```

**Por qué importa:** El parser descarta `required` y se queda con el default, así que la prop deja de ser obligatoria — en silencio, y en dirección contraria a lo que dice la anotación. Nada avisa en runtime; simplemente se deja de avisar a quien la olvida.

#### `type-default-mismatch`

**Severidad:** Error · **Quick fix:** no

> `'NAME': type is 'boolean' but default 'X' is not a recognised boolean (use True/False/1/0).`
> `'NAME': type is 'number' but default 'X' is not a valid number.`

```django
{# @prop loading:boolean | default:"yes" #}
```

**Por qué importa:** El tipo declarado gobierna la validación de cada sitio donde se usa, así que un default que lo contradice hace que el componente incumpla su propia regla. Quien copie el default documentado recibe un error.

#### `enum-default-out-of-range`

**Severidad:** Error · **Quick fix:** sí — one action per allowed option

> `'NAME': @prop default 'X' is not in options [a, b].`
> `'NAME': <c-vars> value 'X' is not in options [a, b].`

```django
{# @prop variant:select['a','b'] | default:"z" #}
```

**Por qué importa:** La lista de opciones es el contrato. Un default fuera de ella significa que el componente se publica en un estado que él mismo declara inválido, y lo hereda todo el que se apoye en ese default.

#### `dynamic-prefix-mismatch`

**Severidad:** Error · **Quick fix:** sí — toggles the `:` prefix

> `'NAME': ':' prefix mismatch — @prop is ':NAME' but <c-vars> has 'NAME'.`

```django
{# @prop :size:text #}
<c-vars size="md">
```

**Por qué importa:** Los dos puntos no son cosméticos: hacen que Cotton evalúe el valor como expresión de Django en vez de pasar una cadena. Que los dos lados no coincidan significa que la documentación y el runtime están pasando cosas distintas.

### Reglas de uso

Comprueban los tags que escribes, allá donde los escribas.

#### `component-not-found`

**Severidad:** Error · **Quick fix:** no

> `component 'NAME' not found`

```django
<c-atoms.does-not-exist />
```

Also fires on a `<c-component is="…">` dispatch whose literal target does not resolve.

**Por qué importa:** El tag renderiza vacío. Cotton no lanza ningún error, así que una errata en el nombre de un componente parece un problema de CSS o un queryset vacío hasta que alguien lee la plantilla con lupa.

#### `invalid-tag-name`

**Severidad:** Error · **Quick fix:** no

> `'NAME' is not a valid component name — expected segments like 'button' or 'atoms.button'`

```django
<c-...>
```

Distinct from `component-not-found`: the name could never resolve to any file, whereas "not found" means a well-formed name with no matching template.

**Por qué importa:** Casi siempre es prosa, no código — un `<c-...>` dentro de una frase. Reportarlo como componente inexistente sería un falso positivo sobre unos puntos suspensivos, así que tiene código y mensaje propios.

#### `missing-required`

**Severidad:** Warning · **Quick fix:** sí — inserts the missing attribute

> `Missing required prop 'NAME' on 'TAG'`

```django
{# in the component: {# @prop title:text | required #} #}
<c-atoms.card />
```

**Por qué importa:** `required` es el componente diciendo que no puede hacer su trabajo sin ese valor. En su lugar recibe una cadena vacía, y eso suele salir a la luz mucho después y en otro sitio.

#### `invalid-value`

**Severidad:** Error · **Quick fix:** no

Three variants, one per constrained type:

> `Invalid value 'X' for 'NAME'. Expected: a, b`
> `Invalid boolean 'X' for 'NAME'. Expected: True or False`
> `Invalid number 'X' for 'NAME'`

```django
{# in the component: {# @prop variant:select['a','b'] #} #}
<c-atoms.card variant="zzz" />
```

Values containing `{{ }}` or `{% %}`, and `:`-prefixed expression attributes, are never checked — the extension cannot evaluate Django.

**Por qué importa:** El tipo acota lo que el componente puede manejar. Un valor fuera de él llega a la plantilla igualmente — `variant="zzz"` acaba como un nombre de clase que no casa con ningún CSS, y el elemento se renderiza sin estilo en vez de fallar.

#### `duplicate-usage-prop`

**Severidad:** Error · **Quick fix:** no

> `Duplicate prop 'NAME' on 'TAG'`

```django
<c-atoms.card size="md" size="lg" />
```

`size` and `:size` collide, because Cotton treats them as the same prop. Framework attributes (`@click`, `::class`) are keyed separately, so `@click` never collides with a prop called `click`.

**Por qué importa:** Cotton se queda con una y descarta la otra, así que el tag se comporta distinto de como se lee. `size` y `:size` colisionan por lo mismo: para Cotton son una sola prop.

#### `unknown-prop`

**Severidad:** Warning · **Quick fix:** no · **Only in `@strict` components**

> `Unknown prop 'NAME' on 'TAG' (@strict mode)`

```django
{# in the component: {# @strict #} #}
<c-atoms.card nonsense="x" />
```

**Por qué importa:** `@strict` es el componente declarando que su lista de props está completa. Un nombre desconocido ahí es casi siempre una errata y, sin la comprobación, se pasa y se ignora en silencio.

#### `deprecated-prop`

**Severidad:** Hint, rendered with a strikethrough · **Quick fix:** no

> `Deprecated prop 'NAME' on 'TAG'`
> `Deprecated prop 'NAME' on 'TAG': REASON`

```django
{# in the component: {# @prop old:text | deprecated:"use 'new' instead" #} #}
<c-atoms.card old="x" />
```

**Por qué importa:** Sigue funcionando, y ese es el problema: nada obliga a migrar, así que la prop acumula sitios donde se usa hasta que quitarla se convierte en un cambio de todo el proyecto.

#### `missing-is-attribute`

**Severidad:** Error · **Quick fix:** no

> `<c-component> requires an 'is' (or ':is') attribute`

```django
<c-component />
```

**Por qué importa:** `<c-component>` es un dispatcher sin destino al que despachar. Falla en el runtime de Cotton, no al editar, así que la plantilla parece correcta hasta que se renderiza la página.

### Lo que nunca se comprueba

Puntos ciegos deliberados: que una regla dispare ahí sería un bug.

- **Anything inside a comment.** `{# … #}`, `<!-- … -->` and `{% comment %}` blocks are prose. A `<c-tag>` written in one is not a usage. The exception is annotation comments — `{# @prop … #}`, `{# @description … #}`, `{# @trigger … #}` — which are Cotton definitions, so a component named inside one is still resolved.
- **The contents of an attribute value.** Whatever lives inside `x-data="…"`, `@click="…"` or `::value="…"` is JavaScript or a Django expression, never more attributes.
- **Framework attributes.** `@click`, `::class`, `x-on:click.away` are passed through by Cotton and are never treated as declared props.
- **Django expressions.** A value containing `{{ }}` or `{% %}`, and any `:`-prefixed attribute, is evaluated by Django at render time. The extension has no context to resolve it, so it never validates it.


## Ajustes

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
