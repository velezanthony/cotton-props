# Publicar una versión

## El flujo

```
rama de trabajo  →  development  →  main  →  Marketplace
```

`main` está protegida por `guard-main.yml`: una pull request hacia ella se
rechaza si no viene de `development`. No se publica desde ningún otro sitio.

## Publicación

`publish.yml` corre al hacer push a `main` y empaqueta con `vsce`. Antes de
mergear `development` en `main`:

1. **Sube `version` en `package.json`.** El Marketplace rechaza volver a subir
   una versión existente, y el fallo llega después del build.
2. **Escribe la entrada del `CHANGELOG.md`.** Se convierte en la pestaña
   Changelog del Marketplace — es para el usuario, no un registro de commits.
3. **Comprueba cómo se ve el README.** Es la página de la ficha. Las imágenes
   tienen que ser URLs absolutas de `raw.githubusercontent.com`; las rutas
   relativas se rompen ahí e `images/` no viaja en el paquete.

## Qué se publica

`.vscodeignore` es una **lista de exclusión**: todo lo que no esté nombrado ahí
viaja en el `.vsix`. Cada fichero de configuración que añadas a la raíz del
repositorio hay que añadirlo también ahí, o se publica.

Lo que viaja a propósito: `dist/`, `media/`, `snippets.json`, `package.json`,
`README.md`, `CHANGELOG.md`, `LICENSE`.

Lo que se excluye y sí importa: `src/`, `out/`, `test-django-cotton/` (una app
Django completa — unos 3.900 ficheros), `docs/`, `images/`, y todos los
directorios que empiezan por punto.

Verifícalo antes de etiquetar:

```bash
npx vsce ls
```

Eso imprime la lista exacta de ficheros. Léela. Un `.vsix` que ha ganado mil
ficheros en silencio es justo el fallo que esa lista de exclusión existe para
evitar.
