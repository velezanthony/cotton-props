# Cambios

Aquí se documenta todo lo reseñable de la extensión Cotton Props.

Este proyecto sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y [Versionado Semántico](https://semver.org/lang/es/).

## [Sin publicar]

### Arreglado

- **Un `<c-tag>` escrito dentro de un comentario ya no cuenta como uso.** Una frase que mencionara un componente — `{# la variable no se puede meter en el atributo del <c-...> #}`, una nota `<!-- ... -->`, un bloque `{% comment %}` — producía errores reales sobre una oración. `<c-...>` en particular llegaba como un componente llamado `...`, porque el patrón de tag tiene que aceptar `.` para que `atoms.button` funcione. Los comentarios de anotación son la excepción deliberada: `{# @prop ... | description:"usa <c-atoms.icon>" #}`, `{# @description ... #}` y `{# @trigger ... #}` son definiciones de Cotton, así que un componente nombrado ahí se sigue resolviendo — conservas el hover y el ir a definición, y se te sigue avisando cuando la documentación nombra un componente que ya no existe.
- **Un nombre mal formado se reporta como mal formado.** `<c-...>` ahora dice `'...' is not a valid component name` en vez de `component '...' not found`, que sugería un fichero ausente.
- **Un `<c-vars>` escrito dentro de un comentario ya no tapa la declaración real.** Un ejemplo en un comentario se tomaba por la declaración, así que todas las comprobaciones de parity contra la de verdad se saltaban en silencio. Los bloques `{% comment %}` también se reconocen ahora como comentarios, en todos los sitios donde se blanquean.


- **Se acabaron las props fantasma salidas de valores de atributo.** Los atributos los lee ahora un escáner de verdad (`src/core/tag-scanner.ts`) en vez de una regex, lo que arregla una familia entera de diagnósticos falsos en los que el contenido del valor de un atributo se tokenizaba como si fueran más atributos:
  - Un `>` dentro de un valor — una función flecha, `a > b`, `{% if a > b %}` — truncaba el cuerpo del tag y se llevaba por delante la comilla de cierre, así que cada identificador de una expresión tipo `x-data` pasaba a ser una prop (`Duplicate prop 'this'`).
  - Los prefijos de framework no se reconocían, así que a `@click="run('{{ a }}', '{{ b }}')"` y `::value="rows['k' + i]"` se les entraba dentro del valor (`Duplicate prop 'option'`, `Duplicate prop 'p'`).
  - Un `{# comentario #}` de Django dentro del cuerpo de un tag se leía como atributos, convirtiendo prosa en props (`Duplicate prop 'de'`).
- **Un atributo fantasma ya no puede silenciar un aviso de `Missing required prop`.** Solo cuentan como «pasados» los atributos con forma de prop, así que un token suelto que casualmente se llamara igual que una prop obligatoria ya no suprime su aviso — un falso negativo que escondía errores reales.
- **El resto de providers dejan de heredar el mismo defecto.** El escáner respalda ahora a todos los lectores que tenían su propia regex de atributos:
  - El **hover** resolvía nombres de prop escaneando una sola línea con un patrón de valor opcional, así que un identificador dentro de un valor ofrecía la documentación de esa prop (`x-data="{ title: 1 }"` en un componente con una prop `title`), y un tag declarado en varias líneas no resolvía nada en absoluto. Arreglados los dos.
  - La **refactorización a dispatch** localizaba la cabecera del tag con un cuerpo `[^>]*?`, así que un `>` en un valor la terminaba antes de tiempo y la acción se retiraba en silencio para un cursor pasado ese punto.
  - Las **decoraciones de atributos dinámicos** se saltaban todo `:prop` que fuera después de un valor con un `>`, y cualquier valor que llevara la comilla contraria (`:label="it's"`). El `::class` de Alpine ya no se tinta como expresión de Cotton.
  - **Quitar el `is=`** dejaba el atributo en su sitio cuando su valor llevaba la comilla contraria, produciendo un tag roto.
  - Las **reglas de parity de `<c-vars>`** (`enum-default-out-of-range`, `dynamic-prefix-mismatch`, `missing-cvars`) leían solo valores entre comillas dobles o sin espacios, así que a `<c-vars label='choose size here'>` se le entraba dentro y sus palabras pasaban a ser atributos fantasma — reportados cuando alguno coincidía con el nombre de otra prop declarada. Un default entre comillas simples se reportaba además con las comillas incluidas en el mensaje. Ahora pasan por el escáner compartido (`findCVarsBody()` + `scanTagAttributes()`), que lee los dos estilos de comillas, sigue leyendo más allá de un `>` dentro de un valor, y se salta un `{# comentario #}` de Django escrito dentro del tag — completando la unificación que el arreglo de c-vars de la 1.0.0 pretendía y se dejó a medias en dos ficheros.
- **Los atributos de framework ya no se confunden con props.** `@click`, `::class` y `x-on:click.away` los pasa Cotton tal cual, y ahora quedan fuera de las comprobaciones de props, de los avisos de prop desconocida en `@strict`, de la supresión de inlay hints y del seguimiento de parámetros en la ayuda de firma.
- **El filtro del árbol de componentes ya no desaparece al hacer clic en un componente.** El filtro es ahora estado de la vista y sobrevive a la caja de texto: cerrarla como sea — `Enter`, `Esc` o un clic en el árbol — conserva lo que hay en pantalla. Antes la caja era dueña del filtro y lo revertía en cualquier cierre que no reconociera como aceptar y, como VS Code oculta la caja al perder el foco, hacer clic en un resultado filtrado borraba el filtro en silencio.

### Cambiado

- **Los diagnósticos llevan origen y código.** El panel de Problems muestra los dos juntos como `cotton-props(duplicate-usage-prop)`, así que cada hallazgo dice qué extensión lo produjo y qué regla disparó, y las dos cosas se pueden filtrar. `Duplicate prop` y `Unknown prop` tenían código definido pero nunca asignado. Los mensajes ya no repiten el nombre de la extensión, porque las columnas ya lo llevan.
- **Limpiar el filtro es siempre un acto explícito** — el botón de la barra de título, `Escape` con el árbol de componentes enfocado, o vaciar la caja. Nada lo limpia a tus espaldas.
- La caja del filtro agrupa las pulsaciones (120 ms), así que escribir una palabra provoca una reconstrucción del árbol en vez de una por carácter.
- **Un solo lector canónico de atributos.** Los diagnósticos, los inlay hints, la ayuda de firma, el resaltador del panel de detalle y el renombrado de props se habían criado cada uno su propia regex de atributos, y cada una fugaba de forma distinta. Ahora comparten `scanTagAttributes()` / `findCottonTags()`, así que un arreglo de parseo aterriza en todos a la vez en vez de en un solo provider.

## [1.0.0] — 15/06/2026

Primera versión pública — una suite completa de IntelliSense, validación y utilidades para componentes de [Django Cotton](https://django-cotton.com/) en VS Code.

### Autocompletado y hover

- **Autocompletado de tags, props y valores** — componentes agrupados por categoría con su documentación; props con distintivos de tipo/default/obligatorio/obsoleto; valores permitidos para props `select` y `boolean`.
- **Snippets de anotación** — `@description`, `@prop` (variantes text/number/boolean/select/required), `@slot`, `@slot:NAME`, `@trigger`, `@strict`.
- **Documentación estructurada al pasar el ratón** — sobre un tag: descripción, tabla de props (tipo + default), slots, HTML del trigger y un distintivo `@strict`; sobre una prop: detalle, descripción y valores permitidos.

### Navegación y refactorización

- **Ir a definición**, **buscar todas las referencias** y símbolos en **Outline** para `@prop`/`@slot`/`@trigger`/`@strict`.
- **Renombrar prop** (F2) se propaga por la anotación `@prop`, `<c-vars>`, el cuerpo de la plantilla y todos los ficheros de uso.
- **Renombrado automático de tag** — los pares de apertura y cierre se mantienen sincronizados mientras escribes, en ambas direcciones y a través del anidamiento.
- **Dispatch dinámico** (`<c-component is="...">`) entendido en sus tres formas — destino literal (resolución completa), prefijo con interpolación (`is="icons.{{ name }}"`, coincidencia por prefijo) y expresión pura (`:is="var"`, deliberadamente sin seguir). Los tags multilínea funcionan; renombrar un fichero reescribe los valores literales de dispatch; y una refactorización convierte entre la forma directa y la de dispatch.

### Diagnósticos (21 reglas)

- **Ficheros de componente** — `@prop` duplicado, `@prop` que falta en `<c-vars>`, props sin documentar, props sin usar, defaults que no coinciden, default con atributo vacío, conflicto entre `required` y `default`, default incompatible con el tipo, default de enum fuera de rango, prefijo dinámico descuadrado, falta `<c-vars>`, falta la descripción.
- **Ficheros de uso** — componente no encontrado, prop desconocida (`@strict`), prop duplicada, prop obsoleta, valor inválido para el tipo, falta una prop obligatoria, `<c-component>` sin `is`.
- **Salto inteligente** — la validación de tipos no se ejecuta nunca sobre props dinámicas (`:prop="var"`) ni expresiones de plantilla (`{{ }}` / `{% %}`).

### Quick fixes

- Documentar una prop (con el tipo inferido) o todas las que falten; añadir una prop obligatoria o todas; añadir a `<c-vars>` (o todas las que falten); sincronizar un default de `<c-vars>`; resolver un conflicto entre `required` y `default`; reemplazar un valor fuera de rango por una `<option>` válida; alternar el prefijo dinámico `:`; insertar un `<c-vars />` que falte; añadir un `| description:""` que falte.

### Barra lateral y ayudas del editor

- **Explorador de componentes Cotton** — árbol de categorías plegable con recuento de diagnósticos por item (`2E 1W`), distintivos de sin usar (`U`) y agregados por categoría.
- **Panel de detalle** — tabla de props, slots y código del componente con resaltado de sintaxis (según tu tema).
- **Arrastrar y soltar** un componente al editor para pegar un bloque de uso completo, con cada prop expandida como tabstop y los defaults rellenos; más copiar tag y búsqueda dentro del árbol.
- **Ayuda de firma**, **inlay hints** (valores por defecto), **code lens** (contadores de uso), **plegado** de bloques de anotación, **resaltado semántico** de las anotaciones `@prop` y pistas `{{ }}` atenuadas sobre los valores de props dinámicas.
- **Comandos** — envolver con componente, extraer a componente, buscar patrones extraíbles. La barra de estado muestra el número de componentes.

### Configuración

- `djangoCottonProps.templatePaths` — descubrimiento de componentes a cualquier profundidad y en varias apps.
- `djangoCottonProps.excludePaths` — carpetas que se saltan por completo, fuera tanto del árbol de componentes como del escaneo de usos.
- `djangoCottonProps.inlayHints.showDefaults`, `djangoCottonProps.dynamicAttr.showExpressionHint`, `djangoCottonProps.diagnostics.missingDescription.severity`.
- Todos los ajustes se aplican **en vivo** — sin recargar la ventana.

### Calidad y seguridad

- **585 tests automatizados** corriendo en un Extension Host real de VS Code.
- Guardia contra path traversal en extraer a componente; creación de ficheros deshacible vía `WorkspaceEdit`; webview de detalle con los scripts deshabilitados, una Content-Security-Policy estricta y escapado completo del HTML.
- Refresco quirúrgico de la barra lateral (sin reconstrucción completa por pulsación) y escaneo del workspace en lotes paralelos para una activación rápida en proyectos grandes.

### Requisitos

- VS Code **1.97+**.
