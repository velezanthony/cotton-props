# Development

## Setup

```bash
npm install
```

Requires Node 20+ and VS Code 1.97 or newer. The Django fixture in
`test-django-cotton/` is committed, so nothing Python is needed to develop or
run the tests.

## Running it

Press `F5`. That opens an Extension Development Host with the fixture workspace
loaded — open any template under `test-django-cotton/templates/` and the
features are live.

`npm run watch` runs esbuild and `tsc --noEmit` together, so a reload picks up
your change and type errors surface in the terminal rather than at package time.

## The commands

| | |
|---|---|
| `npm run compile` | type-check, lint, bundle |
| `npm run check-types` | `tsc --noEmit`, nothing else |
| `npm run lint` | eslint over `src` |
| `npm test` | the full suite — see [testing](testing.md) |
| `npm run package` | production bundle, what ships |

`npm test` runs `pretest` first, so it already compiles and lints. There is
rarely a reason to run `compile` by hand.

## Where to start reading

`src/extension.ts` is wiring and nothing else — it registers providers, the
sidebar and the commands, in that order, with section markers.

The answer to *what props does this tag accept?* comes from three modules:
`scanner.ts` (tag to file, cached), `parser.ts` (file to `PropDefinition[]`) and
`tag-scanner.ts` (reading a tag in a template). Every feature is a presentation
of those. [Architecture](../ARCHITECTURE.md) has the map.

## Branches

`development` integrates; `main` is what ships. A workflow rejects any pull
request into `main` that does not come from `development`.

Work on a branch off `development`, keep it to one theme, and let CI go green
before opening the pull request.
