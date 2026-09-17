# Security

## What this extension can reach

It reads template files in the open workspace and writes to them through the
refactor and rename commands. It makes **no network requests**, ships no
telemetry, and executes nothing from your project — the Django fixture in
`test-django-cotton/` is test data for the suite, never run.

The webview in the sidebar renders component source with a hand-rolled
highlighter and escapes every value it emits. It runs with scripts disabled.

## Reporting a vulnerability

Do not open a public issue.

Use GitHub's private reporting at
[github.com/velezanthony/django-cotton-props/security/advisories/new](https://github.com/velezanthony/django-cotton-props/security/advisories/new).

Include the version, the smallest input that reproduces it, and what you
observed. You will get an acknowledgement within a few days.

## Supported versions

The latest published release. This is a single-maintainer project, so fixes go
out as a new version rather than as patches to older ones.
