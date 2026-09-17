# Cómo contribuir

Gracias por pasarte. Es un proyecto pequeño con un propósito estrecho, así que el
listón no es tanto «¿funciona?» como «¿se seguirá leyendo bien dentro de seis
meses?».

## Antes de abrir una pull request

```bash
rm -rf out && npm test
```

El `rm -rf out` no es superstición — mira [tests](docs/contributors/testing.es.md).
Un `out/` viejo ejecuta tests compilados de otras ramas y reporta fallos que no
tienen nada que ver con tu cambio.

Sal de `development`, mantén la rama en un solo tema, y deja que el CI se ponga
verde. Las pull requests hacia `main` se rechazan si no vienen de `development`.

## Qué se devuelve

**Un segundo lector para una sintaxis que ya lee otra cosa.** Los tags y
atributos pasan por `tag-scanner.ts`. Criarse una regex local para eso es
exactamente la clase de bug que más esfuerzo ha costado quitar de aquí, y sigue
invisible hasta que una entrada concreta llega solo a uno de los lectores.

**Comentarios que repiten el código.** Deja solo lo que el código no puede decir
— mira [convenciones](docs/contributors/conventions.es.md).

**Un diagnóstico sin sección en la referencia.** Cada `DIAG_CODE` necesita su
propia sección en `docs/REFERENCE.md`; si no, falla un test, y en ambas
direcciones.

## Reportar un bug

El reporte útil es la plantilla más pequeña que lo reproduce, y qué esperabas.
Esta extensión lee tus ficheros e infiere — «ha marcado algo que no debía» casi
siempre es una forma de entrada que nadie probó, y esa entrada **es** el reporte
entero.

Abre una issue en
[github.com/velezanthony/cotton-props/issues](https://github.com/velezanthony/cotton-props/issues).

## Dónde está cada cosa

- **[Arquitectura](docs/ARCHITECTURE.es.md)** — los tres módulos del núcleo
- **[Desarrollo](docs/contributors/development.es.md)** — entorno y scripts
- **[Tests](docs/contributors/testing.es.md)** — pasar la suite
- **[Convenciones](docs/contributors/conventions.es.md)** — el estilo que sostiene algo
- **[Publicar una versión](docs/contributors/release.es.md)** — cómo llega al Marketplace
