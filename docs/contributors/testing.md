# Testing

```bash
rm -rf out && npm test
```

The `rm -rf out` is not optional. Read [the trap](#the-trap) before anything
else — it costs everyone an hour the first time.

## Two kinds of test, one runner

Everything runs through `vscode-test` inside a real extension host, against the
Django fixture in `test-django-cotton/`. But the tests split into two shapes,
and picking the wrong one is the most common review comment.

### Pure — prefer this

Functions that take text and return values. No workspace, no document, runs in
milliseconds:

```ts
assert.deepStrictEqual(scanTagAttributes(' on="a > b" label="x"').map(a => a.name),
                       ['on', 'label']);
```

`findTagEnd`, `scanTagAttributes`, `findCottonTags`, `isValidTagName`,
`findPropNameAt`, `matchesFilter`, `filePathToTag` and every parity rule are
already this shape. That is not an accident: `findPropNameAt` was *extracted*
from the hover provider precisely so its offset arithmetic could be pinned
without opening a document.

A test that opens a document to check an offset is testing VS Code.

### Hosted — when the integration is the thing

Completion actually triggering, hover resolving through the provider chain,
diagnostics arriving in the Problems panel, a refactor editing the document.
These need `vscode.workspace.openTextDocument` and the fixture, and they cost
hundreds of milliseconds each:

```ts
const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
    'vscode.executeHoverProvider', uri, position,
);
```

Use them for the wiring, not for the logic behind it.

### Guard tests

A third, smaller category: tests that read files and assert two things agree.
They exist because the alternative is remembering.

| Guard | Pins |
|---|---|
| `diagnostic-metadata.test.ts` | every `DIAG_CODE` has a section in `docs/REFERENCE.md`, and no section names a code that no longer exists |
| `docs-workflow.test.ts` | every page in the mkdocs nav is covered by the workflow's `paths:` filter, and the docs venv is built outside the checkout |

Both fail in **both** directions. A guard that only catches one is half a guard.

## The trap

**`rm -rf out` after every branch switch.**

`compile-tests` is `tsc -p . --outDir out`, and tsc never deletes stale output.
`.vscode-test.mjs` collects `out/test/**/*.test.js`. So a compiled test left
behind by another branch keeps running against source that no longer defines
what it imports.

It produces **false failures that look like your change broke something**. A
branch holding a single commit once reported nine failures, every one a phantom
from a file that did not exist on it.

To see whether you are already affected:

```bash
for f in out/test/suite/*.test.js; do
  b=$(basename "$f" .js)
  [ -f "src/test/suite/$b.ts" ] || echo "ORPHAN: $b"
done
```

## Running it

The suite takes about a minute, and a fresh checkout downloads VS Code first, so
the first run is much slower. Its output is buffered — piping to `tail` hits a
timeout before anything appears. Redirect and wait on the summary:

```bash
npm test > run.log 2>&1
rg '^\s+\d+ (passing|failing)' run.log
```

Wait on that pattern, **not** on `Error:`. The bundled emmet extension dumps
stack traces mid-run, so anything looser triggers early and reports a failure
that is not yours.

`npm test` runs `pretest` first (compile, lint), so there is rarely a reason to
run `compile` by hand.

## CI

`.github/workflows/ci.yml` runs the same suite headless on `main` and
`development`, with Xvfb and the Electron runtime libraries installed. What
passes locally passes there, which is the point of using the real host in both.

`guard-main.yml` rejects any pull request into `main` that does not come from
`development`. `docs.yml` validates the site on `development` and publishes only
from `main`.

## Gotchas

**A test must never duplicate the pattern it tests.** A helper that copies the
regex from the module it exercises proves only that two copies of the same
mistake agree. `component-dispatch-diagnostic.test.ts` used to open with
*"Mirror the regex usage-checks.ts uses"*; it now goes through `findCottonTags`
like the real code.

**Editing source while the suite is compiling gives a meaningless result.** The
run picks up whichever version won the race. Wait for it to finish, then run
again.

**Do not wait on a process with `pgrep -f 'Electron'`.** Leftover
`chrome_crashpad_handler` processes from earlier runs match that pattern and
never exit, so the wait never returns.

**Guard tests read the working tree, not the commit.** `docs-workflow.test.ts`
parses `mkdocs.yml` and `docs.yml` from disk, so it fails on uncommitted edits —
which is what you want, and worth knowing when a failure surprises you.
