import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parseComponent } from '../../core/parser';
import { buildTagHoverMarkdown, findPropNameAt } from '../../core/providers/hover';

// ── Helpers ──

function fixturePath(relativePath: string): string {
    return path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, relativePath);
}

async function getHovers(relativePath: string, line: number, character: number): Promise<vscode.Hover[]> {
    const uri = vscode.Uri.file(fixturePath(relativePath));
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);
    const position = new vscode.Position(line, character);
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        'vscode.executeHoverProvider', uri, position
    );
    return hovers || [];
}

function hoverText(hovers: vscode.Hover[]): string {
    return hovers
        .flatMap(h => h.contents)
        .map(c => c instanceof vscode.MarkdownString ? c.value : String(c))
        .join('\n');
}

// ── Hover Provider ──

suite('HoverProvider', () => {

    const fixture = 'pages/hover-test.html';

    test('hover on component tag shows prop list', async function () {
        this.timeout(5000);
        // Line 0: <c-atoms.button variant="primary" size="md">Click</c-atoms.button>
        // "c-atoms.button" starts at col 1 (after '<'), hover on "atoms" part
        const hovers = await getHovers(fixture, 0, 5);
        const text = hoverText(hovers);
        assert.ok(text.includes('c-atoms.button'), 'Should show component tag name');
        assert.ok(text.includes('variant'), 'Should list variant prop');
        assert.ok(text.includes('size'), 'Should list size prop');
    });

    test('hover on prop name shows prop docs', async function () {
        this.timeout(5000);
        // Line 0: <c-atoms.button variant="primary" size="md">Click</c-atoms.button>
        // "variant" starts at col 17
        const hovers = await getHovers(fixture, 0, 20);
        const text = hoverText(hovers);
        assert.ok(text.includes('variant'), 'Should show prop name');
        assert.ok(text.includes('select'), 'Should show prop type');
        assert.ok(text.includes('c-atoms.button'), 'Should show component reference');
    });

    test('hover on non-cotton content returns nothing', async function () {
        this.timeout(5000);
        // Line 1: <div class="normal">Not cotton</div>
        // Hover on "class" at col 5
        const hovers = await getHovers(fixture, 1, 5);
        // Filter out hovers from other extensions (e.g. HTML language service)
        const cottonHovers = hovers.filter(h =>
            h.contents.some(c =>
                c instanceof vscode.MarkdownString && c.value.includes('c-')
            )
        );
        assert.strictEqual(cottonHovers.length, 0, 'Should not return cotton hovers for non-cotton content');
    });
});

// ── Hover render — gallery-canon fixture ──
//
// These tests exercise buildTagHoverMarkdown directly, with a real
// ParsedComponent parsed from src/test/fixtures/all-annotations.html.
// They verify Phase 1.1–1.4 surface in the hover (description, slots,
// trigger) without depending on workspace fixtures or the scanner cache.

suite('HoverProvider — buildTagHoverMarkdown', () => {

    function loadCanonFixture() {
        const fixturePath = path.resolve(
            __dirname, '..', '..', '..',
            'src', 'test', 'fixtures', 'all-annotations.html',
        );
        return parseComponent(fs.readFileSync(fixturePath, 'utf-8'));
    }

    test('header line includes the c-tag name', () => {
        const md = buildTagHoverMarkdown('atoms.demo', loadCanonFixture()).value;
        assert.ok(md.includes('**c-atoms.demo**'), `Got: ${md}`);
    });

    test('renders @description above the prop list', () => {
        const md = buildTagHoverMarkdown('atoms.demo', loadCanonFixture()).value;
        assert.ok(md.includes('Component that exercises every supported annotation.'), `Got: ${md}`);
    });

    test('lists slots with default + named entries and their descriptions', () => {
        const md = buildTagHoverMarkdown('atoms.demo', loadCanonFixture()).value;
        assert.ok(md.includes('**Slots**'), 'Should have Slots section');
        assert.ok(md.includes('*default*'), 'Should label default slot');
        assert.ok(md.includes('Default content area.'), 'Should include default slot description');
        assert.ok(md.includes('`:header`'), 'Should label named slot :header');
        assert.ok(md.includes('Header slot for custom content.'), 'Should include header slot description');
        assert.ok(md.includes('`:footer`'), 'Should label named slot :footer');
    });

    test('renders @trigger HTML in its own section', () => {
        const md = buildTagHoverMarkdown('atoms.demo', loadCanonFixture()).value;
        assert.ok(md.includes('**Trigger**'), 'Should have Trigger section');
        assert.ok(md.includes('<button>Open</button>'), 'Should include trigger HTML');
    });

    test('Props section lists every parsed @prop', () => {
        const md = buildTagHoverMarkdown('atoms.demo', loadCanonFixture()).value;
        assert.ok(md.includes('**Props**'), 'Should have Props section');
        for (const propName of ['title', 'count', 'variant', 'is_active', 'dynamic_attr']) {
            assert.ok(md.includes(propName), `Should mention prop '${propName}' — got:\n${md}`);
        }
    });

    test('shows @strict chip when parsed.isStrict is true', () => {
        const md = buildTagHoverMarkdown('atoms.s', parseComponent('{# @strict #}\n{# @prop x:text #}')).value;
        assert.ok(md.includes('· *@strict*'), `Got: ${md}`);
    });

    test('does NOT show @strict chip when isStrict is false', () => {
        const md = buildTagHoverMarkdown('atoms.s', parseComponent('{# @prop x:text #}')).value;
        assert.ok(!md.includes('@strict'), `Got: ${md}`);
    });

    test('empty component renders the "no props or slots defined" placeholder', () => {
        const md = buildTagHoverMarkdown('atoms.empty', parseComponent('<div>nothing</div>')).value;
        assert.ok(md.includes('no props or slots defined'), `Got: ${md}`);
    });

    test('component with only @description renders desc but skips placeholder', () => {
        const md = buildTagHoverMarkdown('atoms.x', parseComponent('{# @description Just a wrapper. #}')).value;
        assert.ok(md.includes('Just a wrapper.'), 'Should render description');
        assert.ok(!md.includes('no props or slots defined'), 'Description alone is enough — no placeholder');
    });
});

// ── Prop-name resolution ─────────────────────────────────────────────────
//
// findPropNameAt decides whether the cursor is on a prop name. Its predecessor
// scanned a single line with an optional-value regex, so identifiers inside an
// attribute value resolved as props and multi-line tags resolved as nothing.

suite('HoverProvider — findPropNameAt', () => {

    /** Resolve at the first occurrence of `needle` in `text`. */
    function at(text: string, needle: string): string | undefined {
        return findPropNameAt(text, text.indexOf(needle));
    }

    test('resolves a plain prop name', () => {
        assert.strictEqual(at('<c-atoms.button variant="primary">x</c-atoms.button>', 'variant'), 'variant');
    });

    test('resolves a dynamic prop name without its colon', () => {
        assert.strictEqual(at('<c-atoms.button :variant="theme" />', 'variant'), 'variant');
    });

    test('returns nothing for an offset inside a value', () => {
        assert.strictEqual(at('<c-atoms.button variant="primary" />', 'primary'), undefined);
    });

    // The defect that motivated this: `title` lives inside a JS expression, not
    // in attribute position, so it is not the component's `title` prop.
    test('an identifier inside a JS value is not a prop name', () => {
        const text = '<c-atoms.button state="{ title: 1, size: 2 }" variant="ghost" />';
        assert.strictEqual(at(text, 'title'), undefined);
        assert.strictEqual(at(text, 'size'), undefined);
    });

    test('a word inside a Django comment is not a prop name', () => {
        const text = '<c-atoms.button {# el variant va debajo #}\n  tone="warn" />';
        assert.strictEqual(at(text, 'variant'), undefined);
        assert.strictEqual(at(text, 'tone'), 'tone');
    });

    test('a framework attribute is not a prop name', () => {
        const text = '<c-atoms.button @click="go()" ::class="c" variant="ghost" />';
        assert.strictEqual(at(text, 'click'), undefined);
        assert.strictEqual(at(text, 'class'), undefined);
        assert.strictEqual(at(text, 'variant'), 'variant');
    });

    // The line-scoped predecessor could not see these at all.
    test('resolves a prop on a multi-line tag declaration', () => {
        const text = '<c-atoms.button\n  size="md"\n  variant="primary"\n/>';
        assert.strictEqual(at(text, 'variant'), 'variant');
        assert.strictEqual(at(text, 'size'), 'size');
    });

    test('a > inside an earlier value does not hide later prop names', () => {
        const text = '<c-atoms.button state="{ ok() { return n > 0 } }" variant="ghost" />';
        assert.strictEqual(at(text, 'variant'), 'variant');
    });

    test('returns nothing outside any tag head', () => {
        const text = '<c-atoms.button variant="x">body text</c-atoms.button>';
        assert.strictEqual(at(text, 'body'), undefined);
    });

    test('resolves at the last character of the name', () => {
        const text = '<c-atoms.button variant="x" />';
        assert.strictEqual(findPropNameAt(text, text.indexOf('variant') + 'variant'.length), 'variant');
    });
});
