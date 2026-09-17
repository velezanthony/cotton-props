# Conventions

## Comments

Keep them minimal. A comment survives only if it says something the code cannot:

- A counter-intuitive choice a maintainer would otherwise "fix". `findTagEnd`
  returns `-1` rather than `text.length`; returning the end of the document
  looks more tolerant and is much worse.
- An ordering that *is* the bug. `::` must be tested before `:` in
  `FRAMEWORK_PREFIXES`; alphabetising that array silently breaks Alpine
  handling.
- A guard that looks redundant and is performance. `text[i] === '{'` before
  `skipDjangoBlock` runs once per character over whole documents.
- Where a responsibility deliberately lives, and why it is not somewhere more
  obvious.

Everything else goes: file-header narratives, per-field docstrings restating the
field name, and the story of which bug a line defends against. That belongs in
the commit message — read once, when you need it.

In test files, aim for zero. If a test needs a comment to explain it, the test
*name* is wrong; fix the name.

## Commit messages

State the bug and its consequence. That is what someone needs when `git blame`
lands them on a line they do not understand.

Leave out the test count (CI reports it), re-explanations of a diagnosis given
in an earlier commit, and bullet lists of every sub-case. Ten commits should not
need two hundred lines of body between them.

Conventional commits. No AI attribution or co-author trailers.

## Code

**Regex factories, never shared constants.** A `/g` regex carries mutable
`lastIndex`; a shared instance lets one caller's iteration corrupt another's.

**One canonical reader per question.** Two readers of the same syntax drift, and
the drift stays invisible until an input hits only one of them. Read tags and
attributes through `tag-scanner.ts` — nothing else.

**Offsets inside the core, `Position` at the boundary.** Line arithmetic breaks
on multi-line tags.

**Framework attributes are not props.** `@click`, `::class`, `x-on:`, `hx-` and
`v-` belong to Alpine, HTMX and Vue. Django never sees them, so they must not be
reported as unknown props, and must not satisfy a required one.

## Documents

`README.md` and `CHANGELOG.md` stay at the repository root: the Marketplace
reads README from the package root and nothing else, and GitHub renders both
there. Reference material lives in `docs/` and is excluded from the `.vsix`.

README images must be absolute `raw.githubusercontent.com` URLs. The Marketplace
does not resolve relative paths, and `images/` does not ship.
