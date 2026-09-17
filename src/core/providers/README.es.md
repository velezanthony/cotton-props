# `providers/`

La superficie de VS Code. Cada fichero registra una funcionalidad de lenguaje y
se mantiene fino: localizar el tag bajo el cursor, resolverlo a un fichero, leer
el componente parseado, presentar.

La lógica interesante pertenece al núcleo. Un provider que se cría su propio
parseo es el olor que ya ha mordido a este código — todos tuvieron en su día una
regex de atributos privada, y todas acabaron metiéndose dentro del valor de un
atributo y tokenizando su contenido como si fueran más atributos.

## La forma que comparten

```ts
const tag = findTagContext(document, offset);        // ¿en qué tag estoy?
const filePath = findComponentFile(tag);             // scanner.ts
const props = getCachedProps(filePath);              // scanner.ts, cacheado
// …presentar
```

Todo lo que necesite leer un tag `<c-...>` o sus atributos pasa por
`tag-scanner.ts`. Aquí dentro no debería haber ninguna regex que matchee `<c-`.

## Offsets

El núcleo habla en offsets; VS Code habla en `Position`. Convierte en la
frontera —dentro del provider, lo más tarde posible— y nunca metas línea/columna
en un helper. La aritmética de líneas se rompe en cuanto un tag se declara en
varias líneas, que es justo el defecto para el que se extrajo `findPropNameAt`.

`TagAttribute` da `nameOffset` y `valueOffset` relativos al cuerpo del tag, así
que un provider suma `tag.bodyOffset` y nada más. Si te ves calculando una
posición sumando longitudes de matches, el scanner ya la tiene.

## `diagnostics/`

El subárbol más grande, repartido según dónde dispara cada regla:

- `component-file-checks.ts` — dentro de la plantilla del propio componente
- `usage-checks.ts` — allá donde se escriba un componente
- `rules/` — las comprobaciones de parity entre `@prop` y `<c-vars>`

Cada diagnóstico lleva un `source` y un `code` de `DIAG_CODE`, y cada código
necesita su sección en `docs/REFERENCE.md`. Un test lo exige en ambas
direcciones.

Los atributos de framework (`@click`, `::class`, `x-on:`, `hx-`, `v-`) quedan
fuera de las comprobaciones de props. No son props que se pasen, así que ni se
reportan como desconocidas ni pueden satisfacer una obligatoria.
