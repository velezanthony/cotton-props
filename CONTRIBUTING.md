# Contributing

Thanks for looking. This is a small project with a narrow purpose, so the bar is
less "does it work" and more "does it still read clearly in six months".

## Before you open a pull request

```bash
rm -rf out && npm test
```

The `rm -rf out` is not superstition — see [testing](docs/contributors/testing.md).
A stale `out/` runs compiled tests from other branches and reports failures that
have nothing to do with your change.

Branch off `development`, keep the branch to one theme, and let CI go green.
Pull requests into `main` are rejected unless they come from `development`.

## What gets pushed back

**A second reader for syntax something else already reads.** Tags and attributes
go through `tag-scanner.ts`. Growing a local regex for them is the exact bug
class this codebase has spent the most effort removing, and it stays invisible
until a specific input hits only one of the readers.

**Comments that restate the code.** Keep only what the code cannot say — see
[conventions](docs/contributors/conventions.md).

**A diagnostic without a reference section.** Every `DIAG_CODE` needs its own
section in `docs/REFERENCE.md`; a test fails otherwise, in both directions.

## Reporting a bug

The useful report is the smallest template that reproduces it, plus what you
expected. This extension reads your files and infers — "it flagged something it
shouldn't" is almost always a shape of input nobody tried, and the input is the
whole report.

Open an issue at
[github.com/velezanthony/django-cotton-props/issues](https://github.com/velezanthony/django-cotton-props/issues).

## Where things are

- **[Architecture](docs/ARCHITECTURE.md)** — the three core modules
- **[Development](docs/contributors/development.md)** — setup and scripts
- **[Testing](docs/contributors/testing.md)** — running the suite
- **[Conventions](docs/contributors/conventions.md)** — style that is load-bearing
- **[Release process](docs/contributors/release.md)** — how it reaches the Marketplace
