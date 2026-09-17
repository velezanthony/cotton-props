# Arquitectura

Cómo está montada la extensión, y por qué está montada así. Escrito para quien
va a cambiarla.

## La forma

Todo cuelga de una pregunta: *¿qué props acepta `<c-atoms.button>`?* Contestarla
necesita dos cosas — un mapa de nombre de tag a fichero, y un parseo de las
anotaciones de ese fichero. Cada funcionalidad es una presentación distinta de
esas dos respuestas.

```
                      extension.ts
                   (cableado, nada más)
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   providers/            views/            commands/
   funcionalidades     barra lateral      refactorizaciones
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
       scanner.ts      parser.ts      tag-scanner.ts
       tag → fichero    @prop/<c-vars>  leer un tag
       + caché         → PropDefinition  en una plantilla
```

`constants.ts` y `scanner.ts` los importa casi todo el árbol. Esa **es** la
arquitectura: ancha y plana sobre un núcleo estrecho, no una cadena de capas.

## El núcleo

### `scanner.ts` — dónde viven los componentes

Es dueño del mapa de nombre de tag a ruta de fichero, y de su caché.

`scanComponents()` es síncrono y va contra caché porque a los providers se les
llama desde el hilo de UI y no pueden esperar. `prewarmScanCache()` llena esa
caché al activar y tras cada cambio de disco o configuración, así que el camino
síncrono normalmente está caliente.

`filePathToTag()` es la única definición de cómo una ruta se convierte en tag, y
ahí vive la convención de índice de Cotton: `card/index.html` es `<c-card />`,
no `<c-card.index />`. Tanto el recorrido síncrono como el prewarm asíncrono
pasan por ella, así que no pueden discrepar.

### `parser.ts` — qué declara un componente

Convierte un fichero de componente en `PropDefinition[]` más su descripción,
slots y trigger. Dos fuentes tienen que coincidir: las anotaciones `{# @prop #}`
y el tag `<c-vars>`. El parser lee las dos; los diagnósticos existen para avisar
cuando divergen.

`blankComments()` es la parte que conviene conocer. Una frase que mencione
`<c-vars>` dentro de un `{# #}` o un `{% comment %}` taparía la declaración
real, así que los cuerpos de comentario se blanquean a espacios — misma
longitud, saltos de línea conservados, de modo que todos los offsets siguen
indexando el texto original.

### `tag-scanner.ts` — leer un tag en una plantilla

El lector canónico de `<c-...>` y sus atributos. Existe porque una regex no
recuerda si está dentro del valor de un atributo: un `>` en `on="a > b"` corta
el tag antes de tiempo, `[^"']*` no matchea nada contra la comilla contraria, y
`{# prosa #}` dentro de un cuerpo se lee como una lista de atributos.

Cada uno de esos casos producía un atributo fantasma, y un fantasma que por
casualidad se llamara igual que una prop obligatoria suprimía su aviso — así que
el fallo era silencioso, y parecía un fichero limpio.

- `findTagEnd()` camina hasta el `>` de cierre, saltando valores entrecomillados
  y bloques Django. Devuelve `-1` en un tag sin cerrar, en vez del final del
  documento, porque la respuesta que parece tolerante le entrega al llamante un
  cuerpo hecho con el resto del fichero.
- `scanTagAttributes()` consume cada valor como una unidad y clasifica los
  atributos en `static`, `dynamic` o `framework`. `::class` es de Alpine, no una
  expresión de Cotton, y por eso `::` se comprueba antes que `:`.
- `findCottonTags()` es dueño del salto de comentarios. Vive ahí y no en cada
  llamante porque pedirle a diez sitios que se acuerden de blanquear comentarios
  es como empezó la divergencia que este módulo vino a sustituir. Los
  comentarios de anotación son la excepción deliberada: un componente nombrado
  en un `{# @description #}` es una referencia real.

### `usage-index.ts` — quién usa qué

Un índice inverso de tag a los ficheros que lo referencian, mantenido de forma
incremental al guardar. Alimenta buscar todas las referencias, los contadores
del CodeLens, el distintivo `unused` y el renombrado en todo el proyecto.

También resuelve el dispatch de `<c-component is="...">`: un destino literal
cuenta como uso directo, `icons.{{ name }}` registra un prefijo para que todo
`icons.*` cuente como referenciado, y `:is="var"` es irresoluble y no se
registra a propósito.

El escaneo completo abre ficheros con `openTextDocument` y no con `fs.readFile`
a propósito: llena la caché de modelos de texto de VS Code, que es lo que
permite a símbolos, definición y referencias contestar sobre plantillas que
nadie ha abierto.

## Los bordes

### `providers/` — 21 funcionalidades de lenguaje

Cada uno es un adaptador fino de VS Code sobre el núcleo. Comparten forma:
localizar el tag bajo el cursor, resolverlo a un fichero, leer el componente
parseado, presentar. La lógica interesante está en el núcleo; un provider que se
cría su propio parseo es el olor que ya ha mordido a este código.

`diagnostics/` es el más grande y se reparte según dónde dispara cada regla:
`component-file-checks.ts` corre dentro de la plantilla del propio componente,
`usage-checks.ts` allá donde se escriba un componente, y `rules/` guarda las
comprobaciones de parity que comparan `@prop` con `<c-vars>`.

Cada diagnóstico lleva un `source` y un `code` de `DIAG_CODE`, así que el panel
de Problems muestra `django-cotton-props(duplicate-usage-prop)` y la caja de
filtro puede aislar una regla. Esos códigos están documentados una sección cada
uno en [REFERENCE.es.md](REFERENCE.es.md), y un test falla si un código no tiene
sección o si una sección nombra un código que ya no existe.

### `views/` — la barra lateral

`component-tree.ts` construye un trie de N niveles a partir de los tags
punteados, así que `atoms.forms.input` anida tres. `tree-decorations.ts` cuelga
los distintivos de un esquema de URI `cotton:`. `component-detail.ts` es un
webview; `source-highlight.ts` es su resaltador hecho a mano, sin dependencias
porque la gramática es pequeña y acotada.

### `commands/` — refactorizaciones

Envolver con componente, extraer a componente y buscar patrones extraíbles.
Estos **escriben** en el documento, lo que los pone en otra categoría de riesgo:
un provider que da una respuesta incorrecta molesta; una refactorización que
escribe una respuesta incorrecta le cuesta al usuario deshacerlo.

## ¿Dónde va mi cambio?

| Si cambias | Va en | Porque |
|---|---|---|
| cómo se **lee** un tag o atributo | `tag-scanner.ts` | un solo lector canónico; un segundo diverge |
| qué **declara** un componente | `parser.ts` | `@prop` y `<c-vars>` se parsean en un sitio |
| dónde **vive** un componente | `scanner.ts` | `filePathToTag` es la única definición ruta→tag |
| qué **reporta** un diagnóstico | `providers/diagnostics/` | y su sección en [REFERENCE.es.md](REFERENCE.es.md), o falla un test |
| cómo se **presenta** algo | el provider o la vista | los adaptadores se quedan finos |
| una refactorización que **escribe** | `commands/` | otra categoría de riesgo — ver abajo |

Si tu cambio necesita una forma nueva de leer `<c-...>`, no la necesita. Amplía
`tag-scanner.ts` o usa `findTagEnd`, exportado justo para el llamante que
necesita su propia cabecera.

## Reglas duras

Estas se hacen cumplir, no se sugieren. Y se nombra qué las hace cumplir, para
que sepas qué te va a frenar.

**Cada diagnóstico tiene un código documentado.** `DIAG_CODE` gobierna el filtro
del panel de Problems, y `diagnostic-metadata.test.ts` falla si un código no
tiene sección en `docs/REFERENCE.md` — o si una sección nombra un código que ya
no existe.

**Cada página publicada la vigila el CI.** `docs-workflow.test.ts` compara el
nav de mkdocs con el filtro `paths:` del workflow. Una página fuera de él se
mergea sin ruido y el sitio deja de actualizarse en silencio.

**Factorías de regex, nunca constantes compartidas.** Una regex `/g` arrastra
`lastIndex` mutable; una instancia compartida deja que la iteración de un
llamante corrompa el cursor de otro.

**Los atributos de framework no son props.** `@click`, `::class`, `x-on:`,
`hx-` y `v-` son de Alpine, HTMX y Vue. Django no los ve, así que ni se reportan
como prop desconocida ni pueden satisfacer una obligatoria. `::` se comprueba
antes que `:` por eso mismo — reordenar ese array rompe Alpine en silencio.

**Escribir es otra categoría de riesgo.** Un provider que da una respuesta
incorrecta molesta; una refactorización que escribe una respuesta incorrecta le
cuesta al usuario deshacerlo. Los comandos de `commands/`, `refactor.ts` y
`rename-prop.ts` se revisan con paranoia.

## Convenciones que sostienen algo

**Factorías de regex, nunca constantes compartidas.** Una regex `/g` arrastra
`lastIndex` mutable, así que una instancia compartida deja que la iteración de
un llamante corrompa el cursor de otro. `regex.ts` entrega una instancia nueva
por llamada.

**Un solo lector canónico por pregunta.** Dos lectores de la misma sintaxis
divergen, y la divergencia es invisible hasta que una entrada concreta llega
solo a uno. Ese es el motivo entero de que `tag-scanner.ts` exista, y de que
`findTagEnd` se exporte para el único llamante que necesita su propia cabecera.

**Offsets, no línea/columna, dentro del núcleo.** La aritmética de líneas se
rompe con tags multilínea. Los providers convierten a `Position` en la frontera
con VS Code y en ningún otro sitio.

## El orden de registro sostiene algo

`extension.ts` monta las cosas en un orden fijo, y dos dependencias son reales,
no de estilo:

- El **índice de uso se crea primero**, porque el provider de referencias, los
  contadores del CodeLens y el distintivo `unused` del árbol guardan una
  referencia a él.
- La **vista del árbol se crea antes que los comandos que la manejan**, ya que
  los comandos del filtro capturan `treeView` para poner su descripción y su
  mensaje.

El filtro pertenece al provider del árbol, no a la caja de texto. Ese es el
arreglo de un bug real: VS Code auto-oculta una caja al perder el foco, así que
una caja dueña del filtro lo borraba justo al hacer clic en el componente que
acababas de filtrar.

## Tests

La suite corre en una instancia real de VS Code contra el proyecto Django de
`test-django-cotton/`. Cuesta una descarga y alrededor de un minuto por pasada,
y compra tests que ejercitan el host de extensión de verdad, no una imitación.

La lógica pura se testea pura: `findPropNameAt`, `matchesFilter`,
`scanTagAttributes` y las reglas de parity reciben texto y devuelven valores,
sin workspace de por medio. Prefiere esa forma — un test que abre un documento
para comprobar aritmética de offsets está testeando VS Code.

En [tests](contributors/testing.es.md) está cómo pasarla, y la trampa que le
cuesta una hora a todo el mundo la primera vez.
