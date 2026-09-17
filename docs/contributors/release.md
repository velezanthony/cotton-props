# Release process

## The flow

```
feature branch  →  development  →  main  →  Marketplace
```

`main` is protected by `guard-main.yml`: a pull request into it is rejected
unless it comes from `development`. Nothing is published from anywhere else.

## Publishing

`publish.yml` runs on a push to `main` and packages with `vsce`. Before merging
`development` into `main`:

1. **Bump `version` in `package.json`.** The Marketplace rejects a re-upload of
   an existing version, and the failure arrives after the build.
2. **Write the `CHANGELOG.md` entry.** It becomes the Changelog tab on the
   Marketplace listing — it is user-facing, not a commit log.
3. **Check the README renders.** It is the listing page. Images must be absolute
   `raw.githubusercontent.com` URLs; relative paths break there and `images/`
   does not ship.

## What ships

`.vscodeignore` is a **deny-list**: anything not named in it travels in the
`.vsix`. Every config file added to the repository root has to be added there
too, or it ships.

What ships on purpose: `dist/`, `media/`, `snippets.json`, `package.json`,
`README.md`, `CHANGELOG.md`, `LICENSE`.

What is excluded and matters: `src/`, `out/`, `test-django-cotton/` (a full
Django app — roughly 3,900 files), `docs/`, `images/`, and every dot-directory.

Verify before you tag:

```bash
npx vsce ls
```

That prints the exact file list. Read it. A `.vsix` that quietly gained a
thousand files is the failure mode this deny-list exists to prevent.
