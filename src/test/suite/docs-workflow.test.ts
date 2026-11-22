import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

/**
 * The workflow's `paths:` filter is a second list of what the site publishes,
 * and a document missing from it merges cleanly while the published site keeps
 * serving the old copy. The workflow does not fail — it does not run.
 */

const ROOT = path.resolve(__dirname, '..', '..', '..');
const SITE = path.join(ROOT, 'docs-site');
const DOCS_CONFIG = fs.readFileSync(path.join(SITE, 'docs.config.mjs'), 'utf-8');
const ASTRO_CONFIG = fs.readFileSync(path.join(SITE, 'astro.config.mjs'), 'utf-8');
const WORKFLOW = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'docs.yml'), 'utf-8');

/** Every page under docs/, relative to the repository root. */
function docsDocuments(): string[] {
    return fs.readdirSync(path.join(ROOT, 'docs'), { recursive: true, encoding: 'utf-8' })
        .filter(file => file.endsWith('.md'))
        .map(file => `docs/${file.split(path.sep).join('/')}`);
}

/** Every `content.external` file, relative to the repository root. */
function externalDocuments(): string[] {
    return [...DOCS_CONFIG.matchAll(/file:\s*'\.\.\/([^']+\.md)'/g)].map(m => m[1]);
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

/** Dotted versions compared numerically; true when `version` is at least `minimum`. */
function atLeast(version: string, minimum: string): boolean {
    const [a, b] = [version, minimum].map(v => v.split('.').map(Number));
    for (let i = 0; i < b.length; i++) {
        if (a[i] === undefined) { return false; }  // `22` could be 22.0.0
        if (a[i] !== b[i]) { return a[i] > b[i]; }
    }
    return true;
}

suite('Docs workflow: watches what the site publishes', () => {

    test('all lists parse', () => {
        // Without this, a parse that matched nothing would make every assertion
        // below compare two empty lists and pass.
        assert.ok(docsDocuments().length > 3, 'docs/ listed as empty');
        assert.ok(externalDocuments().length > 3, 'content.external parsed as empty');
        assert.ok(watchedPaths().length > 3, 'paths parsed as empty');
    });

    test('publishes every page under docs/, at the URL MkDocs gave it', () => {
        // Each one is an `external` whose slug is its path, so /docs/REFERENCE/
        // stays /docs/REFERENCE/. A new page without an entry is never published.
        const slugs = new Map(
            [...DOCS_CONFIG.matchAll(/slug:\s*'([^']+)',\s*file:\s*'\.\.\/([^']+)\.md'/g)]
                .map(m => [m[2], m[1]]),
        );
        const wrong = docsDocuments()
            .filter(d => !d.endsWith('.es.md'))
            .map(d => d.replace(/\.md$/, ''))
            .filter(d => slugs.get(d) !== d.replace(/\/index$/, ''));
        assert.deepStrictEqual(wrong, [], 'under docs/, not published at its MkDocs URL');
    });

    test('watches every page under docs/', () => {
        const watched = watchedPaths();
        const missing = docsDocuments().filter(d => !covered(d, watched));
        assert.deepStrictEqual(missing, [], 'published, not in paths — edits would not rebuild');
    });

    test('watches every external document', () => {
        const watched = watchedPaths();
        const missing = externalDocuments().filter(d => !covered(d, watched));
        assert.deepStrictEqual(missing, [], 'in content.external, not in paths — edits would not rebuild');
    });

    test('watches every Spanish sibling, which the config never names', () => {
        const watched = watchedPaths();
        const missing = externalDocuments()
            .map(d => d.replace(/\.md$/, '.es.md'))
            .filter(d => fs.existsSync(path.join(ROOT, d)))
            .filter(d => !covered(d, watched));
        assert.deepStrictEqual(missing, [], 'translated, not watched');
    });

    test('watches its own definition', () => {
        const watched = watchedPaths();
        assert.ok(watched.includes('docs-site/**'), 'docs-site/ not watched');
        assert.ok(watched.includes('.github/workflows/docs.yml'), 'the workflow does not watch itself');
    });

    test('names the site and its base, without which the sitemap is inert', () => {
        assert.ok(/site:\s*'https:\/\/\S+'/.test(ASTRO_CONFIG), 'no site in docs-site/astro.config.mjs');
        assert.ok(/base:\s*'\/cotton-props'/.test(ASTRO_CONFIG), 'base is not /cotton-props');
    });

    test('builds docs-site with Node, not the extension', () => {
        assert.ok(/working-directory:\s*docs-site\b/.test(WORKFLOW), 'the build does not run in docs-site/');
        assert.ok(/npm ci/.test(WORKFLOW) && /npm run build/.test(WORKFLOW), 'no npm ci && npm run build');
        assert.ok(/path:\s*docs-site\/dist\/?\s*$/m.test(WORKFLOW), 'the Pages artifact is not docs-site/dist');
    });

    test('uses a Node the library accepts', () => {
        // @velezanthony/design declares engines.node >=22.23.4.
        const node = /node-version:\s*['"]?([\d.]+)/.exec(WORKFLOW);
        assert.ok(node, 'setup-node is given no node-version');
        const ok = Number(node[1].split('.')[0]) >= 23 || atLeast(node[1], '22.23.4');
        assert.ok(ok, `node ${node[1]} may be older than 22.23.4`);
    });
});
