<!--
Thanks for the PR! Fill in the sections below — anything not relevant can be removed.
See CONTRIBUTING.md for what tends to get pushed back.
-->

## What this changes

<!-- One or two sentences. -->

## Why

<!-- Link to an issue (`Fixes #123`) or describe the motivation. -->

## How

<!-- Quick walkthrough of the approach if it's not obvious from the diff. -->

## Checklist

- [ ] `rm -rf out && npm test` passes locally — a stale `out/` reports failures from other branches
- [ ] `npm run lint` and `npm run check-types` pass
- [ ] Tests added or updated for the behaviour this changes
- [ ] `CHANGELOG.md` and `CHANGELOG.es.md` updated under `[Unreleased]`
- [ ] Docs updated if user-facing behaviour changed — **both** the `.md` and its `.es.md`
- [ ] New `DIAG_CODE`? It has its own section in `docs/REFERENCE.md` (a test fails otherwise)
- [ ] Tags and attributes are read through `tag-scanner.ts`, not a new local regex
- [ ] Branched off `development`, and the branch keeps to one theme

## Anything else

<!-- Trade-offs, follow-up work, screenshots, anything reviewers should know. -->

<!--
Not this PR's job: bumping `version` in package.json. That happens once, when
`development` is merged into `main` — see docs/contributors/release.md.
-->
