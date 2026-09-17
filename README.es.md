# Django Cotton Props

> **IntelliSense, validación y refactorización para componentes de [Django Cotton](https://django-cotton.com/) en VS Code** — autocompletado, documentación al pasar el ratón, 19 reglas de diagnóstico, quick fixes y un explorador de componentes. Deja de adivinar nombres de props y caza los errores de plantilla antes de que lleguen al runtime.

## Míralo en marcha

**Autocompleta cualquier componente, navega y acepta — sin soltar el teclado**

![Autocomplete demo](https://raw.githubusercontent.com/velezanthony/django-cotton-props/main/images/autocomplete.gif)

**Pasa el ratón por cualquier tag y ve la documentación completa de sus props**

![Hover docs](https://raw.githubusercontent.com/velezanthony/django-cotton-props/main/images/hover.png)

**Caza errores mientras escribes — 19 reglas de diagnóstico**

![Diagnostics](https://raw.githubusercontent.com/velezanthony/django-cotton-props/main/images/diagnostics.png)

**Selecciona un componente y revisa sus props, slots y código resaltado — en la barra lateral**

![Component detail panel](https://raw.githubusercontent.com/velezanthony/django-cotton-props/main/images/sidebar.png)

## Primeros pasos

1. **Instala** — busca **Django Cotton Props** en la vista de extensiones, o ejecuta `ext install velezanthony.django-cotton-props`.
2. **Requisitos** — un proyecto [Django Cotton](https://django-cotton.com/) con plantillas de componentes, y VS Code **1.97+**. La estructura por defecto `templates/cotton/` no necesita configuración.
3. **Listo** — abre cualquier plantilla `.html` o `django-html`, escribe `<c-`, y el autocompletado, la documentación y los diagnósticos se encienden al momento.

## Qué hace

Todo funciona en ficheros `.html` y `django-html`, en vivo mientras escribes.

| | |
|---|---|
| ⚡ **Autocompletado** | tags, props y valores — agrupados por categoría, con distintivos de tipo / default / obligatorio / obsoleto |
| 💡 **Documentación al vuelo** | descripción, tabla de props, slots y HTML del trigger en cualquier tag o prop |
| 🧭 **Navegación** | Ir a definición (`F12`), buscar todas las referencias, símbolos en Outline, renombrar prop (`F2`) |
| 🔀 **Dispatch dinámico** | entiende `<c-component is="...">` en sus tres formas |
| 🚦 **Diagnósticos** | 19 reglas en tiempo de edición, en ficheros de componente y de uso |
| 🛠️ **Quick fixes** | acciones de documentar / sincronizar / insertar en un clic, sobre los 9 diagnósticos auto-reparables |
| 🔁 **Renombrado de tag** | el tag de cierre sigue al de apertura mientras editas, incluso anidado |
| 🗂️ **Explorador lateral** | árbol de componentes, panel de detalle y bloques de uso arrastrables |
| 🎁 **Refactorizaciones** | envolver con componente, extraer a componente, convertir directo ↔ dispatch |
| 🎨 **Ayudas del editor** | resaltado semántico, inlay hints, code lens, plegado, ayuda de firma, contador en la barra de estado |
| 📁 **Renombrados seguros** | renombrar el fichero de un componente actualiza todas sus referencias `<c-tag>` en el proyecto |

<details>
<summary><strong>🚦 Las 19 reglas de diagnóstico</strong> — qué se señala mientras editas</summary>

**En ficheros de componente:**
- Definiciones `@prop` duplicadas
- `@prop` que falta en `<c-vars>` (muestra el default si lo hay)
- Props en `<c-vars>` sin documentar
- Props sin usar (declaradas pero nunca referenciadas en el cuerpo)
- Defaults que no coinciden — `@prop` y `<c-vars>` declaran valores distintos
- `@prop` define un default pero el atributo de `<c-vars>` va sin valor
- `<c-vars>` tiene default y `@prop` no lo documenta
- `| required` convive con `| default:` (el parser descarta `required` en silencio)
- Default incompatible con el tipo — `:boolean` fuera de `True/False/1/0`, o `:number` que no parsea
- Default de enum fuera de rango — el default de `:select` (o el valor de `<c-vars>`) no está en la lista
- Prefijo dinámico descuadrado — `:foo` en `@prop` frente a `foo` en `<c-vars>`, o al revés
- Falta `<c-vars>` — hay `@prop` pero no el tag (Cotton no pasa nada a la plantilla)
- Falta la descripción — `@prop` sin filtro `| description:` (nivel sugerencia)

**En ficheros de uso:**
- Componente no encontrado
- Prop desconocida (modo `@strict`)
- Prop duplicada en el mismo tag
- Uso de prop obsoleta (tachada)
- Valor inválido para el tipo (select, boolean, number)
- Falta una prop obligatoria
- Nombre de componente inválido — un tag como `<c-...>` que no puede nombrar a ninguno
- `<c-component>` sin atributo `is` (ni `:is`)

> [!NOTE]
> Los **componentes sin usar** se marcan en la barra lateral (distintivo `U` en el árbol), no como diagnóstico del fichero: «esto no se referencia en ninguna parte» dice algo de su sitio en el sistema, no es un error de código. Añade `{# @ignore-unused #}` dentro del componente para silenciarlo en componentes de librería o de tag dinámico.

> [!TIP]
> La **validación de tipos se salta a propósito** en props dinámicas (`:collapsed="variable"`) y expresiones de plantilla (`{{ var }}`, `{% tag %}`): son valores de Django, no literales, así que no hay falsos positivos.
>
> ```html
> <c-atoms.badge variant="oops" />            <!-- Error: valor de select inválido -->
> <c-atoms.badge :variant="user_variant" />   <!-- se salta: variable de Django -->
> ```

</details>

<details>
<summary><strong>🛠️ Todos los quick fixes</strong> — un clic en la bombilla</summary>

- **Documentar prop** / **Documentar todas** — genera anotaciones `@prop` con el tipo inferido
- **Añadir prop obligatoria** / **Añadir todas** — inserta las obligatorias que faltan, con su default
- **Añadir a `<c-vars>`** / **Añadir todas** — inserta las que faltan en su formato (`:dynamic`, `boolean=False`, `text="valor"`)
- **Sincronizar el default** — ajusta un valor vacío o descuadrado al default del `@prop`
- **Quitar `| required` / quitar `| default:`** — resuelve el conflicto entre ambos
- **Reemplazar por una opción** — una acción por cada opción válida de `:select` cuando el valor está fuera de rango
- **Poner / quitar el prefijo `:`** — alterna el prefijo dinámico en `<c-vars>` para que case con su `@prop`
- **Añadir el tag `<c-vars />`** — inserta la declaración que falta cuando hay `@prop` sin `<c-vars>`
- **Añadir el filtro `| description:""`** — rellena la descripción que falta

</details>

<details>
<summary><strong>🔀 Dispatch dinámico</strong> — las tres formas de <code>&lt;c-component is="..."&gt;</code></summary>

El dispatcher de Cotton renderiza un componente cuyo nombre se decide en runtime. La extensión entiende las tres formas:

| Sintaxis | Tratamiento |
|--------|-----------|
| `<c-component is="icons.spinner" />` | Referencia directa a `c-icons.spinner` — ir a definición, hover, autocompletado y referencias completos. Emite `component-not-found` si no resuelve. |
| `<c-component is="icons.{{ name }}" />` | La parte estática es un **prefijo**: todo `c-icons.*` cuenta como referenciado (sin distintivo `unused` falso). |
| `<c-component :is="my_var" />` | Expresión pura de Django, irresoluble. Usa `{# @ignore-unused #}` en el destino si hace falta. |

Las declaraciones multilínea funcionan igual. Renombrar el fichero de un componente reescribe todos los `is="destino-literal"` que le apuntan, y hay una refactorización para convertir entre forma directa y dispatch.

</details>

<details>
<summary><strong>🗂️ Explorador lateral</strong> — árbol, distintivos, panel de detalle y arrastrar y soltar</summary>

El icono de la barra de actividad abre el panel **Cotton Components**:

- **Árbol de componentes** — categorías plegables con el recuento agregado de diagnósticos: `atoms 59 · 4E 2W 8H · 12 unused`
- **Distintivos por componente** — un solo número con la severidad más alta presente (tope `9+`) y su color; distintivo `U` cuando un componente no tiene diagnósticos y no se referencia en ningún sitio. La fila lo desglosa entero: `3 props · 2E 1W 8H · unused`
- **Panel de detalle** — haz clic en un componente para ver su tabla de props, sus slots y el código resaltado
- **Arrastrar y soltar** — arrastra un componente al editor para insertar un bloque de uso completo, con cada prop como tabstop y los defaults rellenos; `Tab` va saltando entre ellos
- **Filtro por tag** — el botón de la barra de título abre una caja y el árbol se estrecha mientras escribes, comparando sin distinguir mayúsculas contra el tag punteado completo (así `atoms` y `button` llegan los dos a `atoms.button`). El filtro activo aparece como `Filter: …` en la cabecera de la vista y sobrevive a cerrar la caja; se limpia con el botón, vaciando la caja, o con `Escape` con el árbol enfocado
- **Copiar tag** y **búsqueda** dentro del árbol (`Ctrl+F`)

</details>

<details>
<summary><strong>🎨 Resaltado semántico</strong> — colores de las anotaciones <code>@prop</code> (según tu tema)</summary>

| Token | Ejemplo | Color |
|-------|---------|-------|
| Delimitadores | `{#` `#}` `\|` | comentario (verde/gris) |
| Palabras clave | `@prop` | keyword (morado) |
| Nombre de prop | `variant` | variable (azul) |
| Nombres de filtro | `default` `description` | variable (azul) |
| Valores | `"primary"` `13` `False` | string (naranja) |
| Tags de componente | `c-atoms.button` | keyword (morado) |

Los colores se adaptan al tema activo de VS Code.

</details>

## Referencia

El catálogo completo está en [`docs/REFERENCE.es.md`](https://github.com/velezanthony/django-cotton-props/blob/main/docs/REFERENCE.es.md):

- **[Sintaxis de anotaciones](https://github.com/velezanthony/django-cotton-props/blob/main/docs/REFERENCE.es.md#sintaxis-de-anotaciones)** — todos los filtros de `@prop`, el contrato de `<c-vars>` y cómo se mantienen sincronizados
- **[Reglas de diagnóstico](https://github.com/velezanthony/django-cotton-props/blob/main/docs/REFERENCE.es.md#reglas-de-diagnóstico)** — una sección por código, con la entrada mínima que lo dispara
- **[Ajustes](https://github.com/velezanthony/django-cotton-props/blob/main/docs/REFERENCE.es.md#ajustes)** — todas las opciones `djangoCottonProps.*`

## Si algo no va

<details>
<summary><strong>¿No aparecen los componentes?</strong></summary>

- **¿Sin autocompletado, o la barra lateral vacía?** La extensión escanea `templates/cotton/` por defecto. Si tus componentes están en otro sitio, añade la carpeta a `djangoCottonProps.templatePaths` — se comparan sufijos de ruta a cualquier profundidad, así que una entrada cubre la raíz del proyecto y todas las apps de Django. Los cambios se aplican en vivo, sin recargar.
- **¿Un componente marcado `unused` que sí se usa?** Solo se alcanza por un `<c-component is="...">` dinámico que el indexador no puede resolver. Añade `{# @ignore-unused #}` dentro del componente para quitar el distintivo.
- **¿Un uso que no se valida?** Las comprobaciones de tipo se saltan a propósito en props dinámicas (`:prop="var"`) y expresiones de plantilla (`{{ }}`, `{% %}`): son valores de Django, no literales.

</details>

---

Hecho para [Django Cotton](https://django-cotton.com/) · Licencia MIT · Requiere VS Code 1.97+
