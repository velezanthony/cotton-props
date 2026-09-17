import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

/**
 * The workflow's `paths:` filter is a second list of what the site publishes,
 * and a document missing from it merges cleanly while the published site keeps
 * serving the old copy. The workflow does not fail — it does not run.
 */

const ROOT = path.resolve(__dirname, '..', '..', '..');
const MKDOCS = fs.readFileSync(path.join(ROOT, 'mkdocs.yml'), 'utf-8');
const WORKFLOW = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'docs.yml'), 'utf-8');

/** Every `.md` the nav publishes, as written. */
function navDocuments(): string[] {
    const nav = /^nav:\n((?:[ \t]+.*\n|\n)*)/m.exec(MKDOCS);
    assert.ok(nav, 'no nav block in mkdocs.yml');
    return [...nav[1].matchAll(/([\w./-]+\.md)\s*$/gm)].map(m => m[1]);
}

/** The `paths:` entries of the workflow's push trigger. */
function watchedPaths(): string[] {
    const block = /paths:\n((?:\s+-\s+.*\n)+)/.exec(WORKFLOW);
    assert.ok(block, 'no paths block in docs.yml');
    return [...block[1].matchAll(/-\s+'([^']+)'/g)].map(m => m[1]);
}

/**
 * GitHub's glob subset, as the workflow uses it: `**` spans directories, `*`
 * does not, and a leading `*` at the root therefore means root files only.
 */
function covered(doc: string, watched: string[]): boolean {
    return watched.some(pattern => {
        if (pattern === doc) { return true; }
        const re = new RegExp(
            '^' + pattern
                .replace(/[.+^${}()|[\]\\]/g, '\\$&')
                .replace(/\*\*/g, '\u0000')      // placeholder: crosses `/`
                .replace(/\*/g, '[^/]*')          // single star: does not
                .replace(/\u0000/g, '.*') + '$',
        );
        return re.test(doc);
    });
}

suite('Docs workflow: watches what the site publishes', () => {

    test('both lists parse', () => {
        // Without this, a parse that matched nothing would make every assertion
        // below compare two empty lists and pass.
        assert.ok(navDocuments().length > 3, 'nav parsed as empty');
        assert.ok(watchedPaths().length > 3, 'paths parsed as empty');
    });

    test('watches every document the nav publishes', () => {
        const watched = watchedPaths();
        const missing = navDocuments().filter(d => !covered(d, watched));
        assert.deepStrictEqual(missing, [], 'in the nav, not in paths — edits would not rebuild');
    });

    test('watches every Spanish sibling, which the nav never names', () => {
        const watched = watchedPaths();
        const missing = navDocuments()
            .map(d => d.replace(/\.md$/, '.es.md'))
            .filter(d => fs.existsSync(path.join(ROOT, d)))
            .filter(d => !covered(d, watched));
        assert.deepStrictEqual(missing, [], 'translated, not watched');
    });

    test('watches its own definition', () => {
        const watched = watchedPaths();
        assert.ok(watched.includes('mkdocs.yml'), 'mkdocs.yml not watched');
        assert.ok(watched.includes('.github/workflows/docs.yml'), 'the workflow does not watch itself');
    });

    test('names the site url, without which the sitemap is inert', () => {
        assert.ok(/^site_url:\s*https?:\/\/\S+/m.test(MKDOCS), 'no site_url in mkdocs.yml');
    });

    test('builds the venv outside the checkout', () => {
        // mkdocs-static-i18n treats anything under docs_dir as the user's, and
        // same-dir makes docs_dir the repository root — a venv inside it puts
        // the theme's own assets in scope and the build dies copying them.
        const venv = /uv venv[^\n]*?["']?(\$\{?\w+\}?[^"'\s]*|\/[^"'\s]+)["']?\s*$/m.exec(WORKFLOW);
        assert.ok(venv, 'uv venv is given no path — it would create .venv in the checkout');

        const target = venv[1];
        const outside = target.startsWith('$RUNNER_TEMP') || target.startsWith('/');
        assert.ok(outside, `the venv must live outside the checkout, got ${target}`);
    });

    test('installs into that venv rather than the ambient python', () => {
        // `uv venv` ships no pip, so anything reaching for `python -m pip` fails.
        assert.ok(
            /uv pip install --python\s+"\$RUNNER_TEMP/.test(WORKFLOW),
            'uv pip install must target the venv interpreter explicitly',
        );
    });
});
