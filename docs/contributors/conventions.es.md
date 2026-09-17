# Convenciones

## Comentarios

Al mínimo. Un comentario sobrevive solo si dice algo que el código no puede:

- Una decisión contraintuitiva que alguien "arreglaría". `findTagEnd` devuelve
  `-1` en vez de `text.length`; devolver el final del documento parece más
  tolerante y es mucho peor.
- Un orden que **es** el bug. `::` tiene que comprobarse antes que `:` en
  `FRAMEWORK_PREFIXES`; ordenar ese array alfabéticamente rompe Alpine en
  silencio.
- Un guardia que parece redundante y es rendimiento. `text[i] === '{'` antes de
  `skipDjangoBlock` corre una vez por carácter sobre documentos enteros.
- Dónde vive una responsabilidad a propósito, y por qué no está en el sitio más
  evidente.

Todo lo demás fuera: narrativas de cabecera, docstrings que repiten el nombre
del campo, y la historia del bug que cada línea defiende. Eso va en el mensaje
del commit — se lee una vez, cuando hace falta.

En ficheros de test, cero. Si un test necesita un comentario para entenderse, el
*nombre* del test está mal; arregla el nombre.

## Mensajes de commit

Cuenta el bug y su consecuencia. Es lo que alguien necesita cuando un `git blame`
le deja en una línea que no entiende.

Fuera el recuento de tests (ya lo dice el CI), las re-explicaciones de un
diagnóstico que diste en un commit anterior, y las listas de cada subcaso. Diez
commits no deberían necesitar doscientas líneas de cuerpo entre todos.

Conventional commits. Sin atribución a IA ni trailers de coautoría.

## Código

**Factorías de regex, nunca constantes compartidas.** Una regex `/g` arrastra
`lastIndex` mutable; una instancia compartida deja que la iteración de un
llamante corrompa el cursor de otro.

**Un solo lector canónico por pregunta.** Dos lectores de la misma sintaxis
divergen, y la divergencia es invisible hasta que una entrada concreta llega
solo a uno de ellos. Los tags y atributos se leen por `tag-scanner.ts`, y por
nada más.

**Offsets dentro del núcleo, `Position` en la frontera.** La aritmética de
líneas se rompe con tags multilínea.

**Los atributos de framework no son props.** `@click`, `::class`, `x-on:`, `hx-`
y `v-` son de Alpine, HTMX y Vue. Django no los ve, así que no deben reportarse
como prop desconocida ni pueden satisfacer una obligatoria.

## Documentos

`README.md` y `CHANGELOG.md` se quedan en la raíz: el Marketplace lee el README
de la raíz del paquete y nada más, y GitHub renderiza los dos ahí. El material
de referencia vive en `docs/` y queda excluido del `.vsix`.

Las imágenes del README tienen que ser URLs absolutas de
`raw.githubusercontent.com`. El Marketplace no resuelve rutas relativas, e
`images/` no viaja en el paquete.
