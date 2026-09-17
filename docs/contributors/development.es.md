# Desarrollo

## Preparar el entorno

```bash
npm install
```

Necesitas Node 20+ y VS Code 1.97 o superior. El proyecto Django de
`test-django-cotton/` está commiteado, así que no hace falta nada de Python para
desarrollar ni para pasar los tests.

## Ejecutarlo

Pulsa `F5`. Se abre un host de desarrollo de extensiones con el workspace del
fixture cargado — abre cualquier plantilla de `test-django-cotton/templates/` y
tienes las funcionalidades en vivo.

`npm run watch` lanza esbuild y `tsc --noEmit` a la vez, así que una recarga
recoge tu cambio y los errores de tipos salen en la terminal, no al empaquetar.

## Los comandos

| | |
|---|---|
| `npm run compile` | comprobar tipos, linter, bundle |
| `npm run check-types` | `tsc --noEmit` y nada más |
| `npm run lint` | eslint sobre `src` |
| `npm test` | la suite completa — mira [tests](testing.es.md) |
| `npm run package` | bundle de producción, lo que se publica |

`npm test` ejecuta `pretest` antes, así que ya compila y pasa el linter. Rara vez
hay motivo para lanzar `compile` a mano.

## Por dónde empezar a leer

`src/extension.ts` es cableado y nada más — registra providers, barra lateral y
comandos, en ese orden, con marcadores de sección.

La respuesta a *¿qué props acepta este tag?* sale de tres módulos:
`scanner.ts` (tag a fichero, cacheado), `parser.ts` (fichero a
`PropDefinition[]`) y `tag-scanner.ts` (leer un tag en una plantilla). Cada
funcionalidad es una presentación de eso. El mapa está en
[arquitectura](../ARCHITECTURE.es.md).

## Ramas

`development` integra; `main` es lo que se publica. Un workflow rechaza
cualquier pull request hacia `main` que no venga de `development`.

Trabaja en una rama salida de `development`, mantenla en un solo tema, y deja
que el CI se ponga verde antes de abrir la pull request.
