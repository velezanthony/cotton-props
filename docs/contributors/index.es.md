# Para quien contribuye

La extensión contesta una sola pregunta — *¿qué props acepta
`<c-atoms.button>`?* — y cada funcionalidad es una presentación distinta de la
respuesta.

Empieza por aquí:

- **[Desarrollo](development.es.md)** — preparar el entorno, `F5`, los scripts
  de npm, por dónde empezar a leer
- **[Tests](testing.es.md)** — cómo pasar la suite, y la trampa del `out/` viejo
  que le cuesta una hora a todo el mundo la primera vez
- **[Arquitectura](../ARCHITECTURE.es.md)** — los tres módulos del núcleo y por
  qué el árbol es ancho y plano en vez de estar por capas
- **[Convenciones](conventions.es.md)** — comentarios, mensajes de commit, y las
  reglas que sostienen algo en vez de ser estilo
- **[Publicar una versión](release.es.md)** — cómo un cambio llega al Marketplace

## La versión corta

Lee tags y atributos por `tag-scanner.ts`. No hagas crecer un segundo lector
para una sintaxis que ya lee otra cosa — esa divergencia es la clase de bug que
más esfuerzo ha costado quitar de este código, y es invisible hasta que una
entrada concreta llega solo a uno de los lectores.
