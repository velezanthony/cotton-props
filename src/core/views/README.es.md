# `views/`

La barra lateral: el árbol de componentes, sus distintivos y el webview de
detalle.

## `component-tree.ts`

Construye un trie de N niveles a partir de los tags punteados, así que
`atoms.forms.input` anida tres. Un nodo puede ser carpeta y componente a la vez
— la convención de índice de Cotton hace que `button/index.html` sea
`<c-button />`, o sea que `button` puede tener hijos **y** ser componente él
mismo.

El filtro por tag vive aquí, no en la caja que lo edita. `matchesFilter` compara
contra el **tag punteado completo**, que es por lo que `atoms` y `button` llegan
los dos a `atoms.button`. Déjalo así: comparar solo con la etiqueta de la fila
rompería toda búsqueda punteada.

`setFilter` dispara una reconstrucción completa y no un refresco quirúrgico,
porque el conjunto de coincidencias cambia de estructura y hay que recorrer de
nuevo los items cacheados.

## `tree-decorations.ts`

Los distintivos cuelgan de un esquema de URI `cotton:` a través de
`FileDecorationProvider`. Es la única forma de colorear una fila del árbol por
severidad — `TreeItem` no tiene API para eso.

Un componente muestra un solo número: el recuento de su severidad más alta, con
tope `9+`. El desglose completo va en la descripción de la fila.

## `component-detail.ts` y `source-highlight.ts`

Un webview y su resaltador. El resaltador está hecho a mano y sin dependencias
porque la gramática es pequeña y acotada: tres delimitadores de Django, pares de
tag y atributo HTML, y el vocabulario de anotaciones.

Escapa todo lo que emite y corre con los scripts deshabilitados. Los tramos de
atributo salen de `scanTagAttributes`, así que el panel clasifica `:size` y
`::class` igual que los diagnósticos.

## Añadir cosas al árbol

Los items se cachean por ruta completa en `_items`, que es lo que hace posibles
los refrescos quirúrgicos con `fire(item)` — VS Code solo actualiza items que él
mismo emitió. Si añades un tipo de item nuevo, tiene que entrar en esa caché o
sus refrescos se ignorarán en silencio.
