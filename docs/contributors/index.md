# For contributors

The extension answers one question — *what props does `<c-atoms.button>`
accept?* — and every feature is a different presentation of the answer.

Start here:

- **[Development](development.md)** — setup, `F5`, the npm scripts, where to
  start reading
- **[Testing](testing.md)** — how to run the suite, and the stale-`out/` trap
  that costs everyone an hour the first time
- **[Architecture](../ARCHITECTURE.md)** — the three core modules and why the
  tree is wide and shallow rather than layered
- **[Conventions](conventions.md)** — comments, commit messages, and the rules
  that are load-bearing rather than stylistic
- **[Release process](release.md)** — how a change reaches the Marketplace

## The short version

Read tags and attributes through `tag-scanner.ts`. Never grow a second reader
for syntax something else already reads — that drift is the bug class this
codebase has spent the most effort removing, and it is invisible until a
specific input hits only one of the readers.
