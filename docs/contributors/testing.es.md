# Tests

```bash
rm -rf out && npm test
```

El `rm -rf out` no es opcional. Lee [la trampa](#la-trampa) antes que nada — le
cuesta una hora a todo el mundo la primera vez.

## Dos tipos de test, un solo runner

Todo pasa por `vscode-test` dentro de un host de extensión real, contra el
proyecto Django de `test-django-cotton/`. Pero los tests se parten en dos
formas, y elegir la equivocada es el comentario de revisión más frecuente.

### Puros — prefiere estos

Funciones que reciben texto y devuelven valores. Sin workspace, sin documento,
en milisegundos:

```ts
assert.deepStrictEqual(scanTagAttributes(' on="a > b" label="x"').map(a => a.name),
                       ['on', 'label']);
```

`findTagEnd`, `scanTagAttributes`, `findCottonTags`, `isValidTagName`,
`findPropNameAt`, `matchesFilter`, `filePathToTag` y todas las reglas de parity
ya tienen esa forma. No es casualidad: `findPropNameAt` se **extrajo** del
provider de hover precisamente para poder fijar su aritmética de offsets sin
abrir un documento.

Un test que abre un documento para comprobar un offset está testeando VS Code.

### Alojados — cuando lo que pruebas es la integración

Que el autocompletado dispare de verdad, que el hover resuelva por la cadena de
providers, que los diagnósticos lleguen al panel de Problems, que una
refactorización edite el documento. Necesitan
`vscode.workspace.openTextDocument` y el fixture, y cuestan cientos de
milisegundos cada uno.

Úsalos para el cableado, no para la lógica que hay detrás.

### Tests guardianes

Una tercera categoría, más pequeña: tests que leen ficheros y comprueban que dos
cosas coinciden. Existen porque la alternativa es acordarse.

| Guardián | Fija |
|---|---|
| `diagnostic-metadata.test.ts` | cada `DIAG_CODE` tiene sección en `docs/REFERENCE.md`, y ninguna sección nombra un código inexistente |
| `docs-workflow.test.ts` | cada página del nav está cubierta por el filtro `paths:`, y el venv de docs se construye fuera del checkout |

Los dos fallan en **ambas** direcciones. Un guardián que solo caza una es medio
guardián.

## La trampa

**`rm -rf out` después de cada cambio de rama.**

`compile-tests` es `tsc -p . --outDir out`, y tsc nunca borra lo que sobra.
`.vscode-test.mjs` recoge `out/test/**/*.test.js`. Así que un test compilado que
dejó otra rama sigue ejecutándose contra código que ya no define lo que importa.

Produce **fallos falsos que parecen roturas tuyas**. Una rama con un solo commit
llegó a reportar nueve fallos, todos fantasmas de ficheros que no existían en
ella.

Para ver si ya te está pasando:

```bash
for f in out/test/suite/*.test.js; do
  b=$(basename "$f" .js)
  [ -f "src/test/suite/$b.ts" ] || echo "HUÉRFANO: $b"
done
```

## Ejecutarla

La suite tarda alrededor de un minuto, y en un checkout nuevo se descarga VS
Code primero, así que la primera vez es mucho más lenta. Su salida va
bufferizada — pasarla por `tail` agota el tiempo antes de que aparezca nada.
Redirige y espera al resumen:

```bash
npm test > run.log 2>&1
rg '^\s+\d+ (passing|failing)' run.log
```

Espera a ese patrón, **no** a `Error:`. La extensión emmet que viene incluida
vuelca stack traces a mitad de la ejecución, así que cualquier cosa más laxa
dispara antes de tiempo y reporta un fallo que no es tuyo.

`npm test` ejecuta `pretest` antes (compilar, linter), así que rara vez hay
motivo para lanzar `compile` a mano.

## CI

`.github/workflows/ci.yml` pasa la misma suite en headless sobre `main` y
`development`, con Xvfb y las librerías de Electron instaladas. Lo que pasa en
local pasa allí, que es el sentido de usar el host real en los dos sitios.

`guard-main.yml` rechaza toda pull request hacia `main` que no venga de
`development`. `docs.yml` valida el sitio en `development` y solo publica desde
`main`.

## Trampas sueltas

**Un test nunca debe duplicar el patrón que prueba.** Un helper que copia la
regex del módulo que ejercita solo demuestra que dos copias del mismo error
coinciden. `component-dispatch-diagnostic.test.ts` empezaba con *"Mirror the
regex usage-checks.ts uses"*; ahora pasa por `findCottonTags` igual que el
código real.

**Editar el código mientras la suite compila da un resultado sin valor.** La
ejecución coge la versión que gane la carrera. Espera a que termine y vuelve a
lanzarla.

**No esperes a un proceso con `pgrep -f 'Electron'`.** Quedan
`chrome_crashpad_handler` de ejecuciones anteriores que matchean ese patrón y no
mueren nunca, así que la espera no vuelve jamás.

**Los guardianes leen el árbol de trabajo, no el commit.**
`docs-workflow.test.ts` parsea `mkdocs.yml` y `docs.yml` desde disco, así que
falla con ediciones sin commitear — que es lo que quieres, y conviene saberlo
cuando un fallo te sorprenda.
