import * as assert from 'assert';
import { scanTagAttributes, findCottonTags, isValidTagName } from '../../core/tag-scanner';

// These fixtures are synthetic. Each one encodes a shape that the previous
// regex-based reader got wrong: a `>` inside a value truncated the tag body, an
// `@`- or `::`-prefixed name was never consumed so the scanner walked into the
// value, and a Django `{# #}` comment inside the tag body was read as prose
// attributes. The names below are invented — they only need the shape.

/** Attribute names as written, in source order — the assertion that matters
 *  most, because every historical bug showed up as extra phantom entries. */
function names(body: string): string[] {
    return scanTagAttributes(body).map(a => a.raw);
}

suite('tag-scanner: scanTagAttributes', () => {

    test('reads bare flags, quoted values, and unquoted values', () => {
        assert.deepStrictEqual(
            names(' wide title="Hello" label=\'World\' count=3 open=False'),
            ['wide', 'title', 'label', 'count', 'open'],
        );
    });

    test('captures values with the quotes stripped', () => {
        const attrs = scanTagAttributes(' title="Hello" label=\'World\' count=3 wide');
        assert.deepStrictEqual(attrs.map(a => a.value), ['Hello', 'World', '3', undefined]);
    });

    test('a double-quoted value may contain single quotes', () => {
        const attrs = scanTagAttributes(` onpick="pick('a', 'b')"`);
        assert.deepStrictEqual(names(` onpick="pick('a', 'b')"`), ['onpick']);
        assert.strictEqual(attrs[0].value, "pick('a', 'b')");
    });

    test('a single-quoted value may contain double quotes', () => {
        const attrs = scanTagAttributes(` config='{"key": "value"}' size="md"`);
        assert.deepStrictEqual(names(` config='{"key": "value"}' size="md"`), ['config', 'size']);
        assert.strictEqual(attrs[0].value, '{"key": "value"}');
    });

    // ── The bug that produced `Duplicate prop 'option'` ──
    test('an @-prefixed value is consumed whole, not tokenized', () => {
        const body = ` @click="pick('{{ row.id }}', '{{ row.slug }}', '{{ row.kind }}')" size="lg"`;
        assert.deepStrictEqual(names(body), ['@click', 'size']);
    });

    test('two @-prefixed attributes do not collapse into a phantom duplicate', () => {
        const body = ` @click="go('{{ item.a }}')" @keyup="go('{{ item.b }}')"`;
        assert.deepStrictEqual(names(body), ['@click', '@keyup']);
    });

    // ── The bug that produced `Duplicate prop 'p'` ──
    test('a ::-prefixed binding is consumed whole, not tokenized', () => {
        const body = ` ::name="'row_' + idx" ::value="store['row_' + idx] || ''" tone="soft"`;
        assert.deepStrictEqual(names(body), ['::name', '::value', 'tone']);
    });

    test('a dotted framework name keeps its modifiers', () => {
        const body = ` @keydown.enter.prevent="submit()" x-on:click.away="close()"`;
        assert.deepStrictEqual(names(body), ['@keydown.enter.prevent', 'x-on:click.away']);
    });

    // ── The bug that produced `Duplicate prop 'de'` / `'el'` ──
    test('a Django comment inside the tag body yields no attributes', () => {
        const body = ` id="panel"\n  {# el valor por defecto de la libreria no sirve aqui #}\n  mode="wide"`;
        assert.deepStrictEqual(names(body), ['id', 'mode']);
    });

    test('two Django comments cannot produce a duplicate from repeated prose', () => {
        const body = ` {# de uno #} a="1" {# de dos #} b="2"`;
        assert.deepStrictEqual(names(body), ['a', 'b']);
    });

    test('Django tags and variables in attribute position yield no attributes', () => {
        const body = ` {% if compact %}compact{% endif %} {{ extra }} size="sm"`;
        assert.deepStrictEqual(names(body), ['compact', 'size']);
    });

    // ── Cotton prop shapes ──
    test('classifies static, dynamic, and framework attributes', () => {
        const attrs = scanTagAttributes(' size="md" :label="expr" @click="go()" ::class="c"');
        assert.deepStrictEqual(attrs.map(a => a.kind), ['static', 'dynamic', 'other', 'other']);
        assert.deepStrictEqual(attrs.map(a => a.name), ['size', 'label', 'click', 'class']);
    });

    test('an unquoted value never swallows the following attribute', () => {
        assert.deepStrictEqual(names(' count=3 wide label="x"'), ['count', 'wide', 'label']);
    });

    test('name and value offsets point at the real source positions', () => {
        const body = ' size="md"';
        const [attr] = scanTagAttributes(body);
        assert.strictEqual(body.substring(attr.nameOffset, attr.nameOffset + attr.raw.length), 'size');
        assert.strictEqual(body.substring(attr.valueOffset!, attr.valueOffset! + attr.value!.length), 'md');
    });

    test('an empty body yields no attributes', () => {
        assert.deepStrictEqual(names(''), []);
    });

    test('an unterminated value does not emit tokens from inside it', () => {
        assert.deepStrictEqual(names(' size="md" label="unclosed and then some words'), ['size', 'label']);
    });
});

suite('tag-scanner: findCottonTags', () => {

    /** The body the scanner hands to attribute reading — the value that used to
     *  be truncated at the first `>` inside a quoted value. */
    function bodyOf(text: string): string {
        const tags = findCottonTags(text);
        assert.strictEqual(tags.length, 1, `expected exactly one tag, got ${tags.length}`);
        return tags[0].body;
    }

    test('finds a simple tag with its name and body', () => {
        const tags = findCottonTags('<c-demo.card size="md">');
        assert.strictEqual(tags.length, 1);
        assert.strictEqual(tags[0].name, 'demo.card');
        assert.strictEqual(tags[0].body.trim(), 'size="md"');
        assert.strictEqual(tags[0].selfClosing, false);
    });

    test('detects a self-closing tag without swallowing the slash into the body', () => {
        const tags = findCottonTags('<c-demo.card size="md" />');
        assert.strictEqual(tags[0].selfClosing, true);
        assert.strictEqual(tags[0].body.trim(), 'size="md"');
    });

    // ── The bug that produced `Duplicate prop 'this'` ──
    test('an arrow function in a value does not truncate the tag body', () => {
        const text = `<c-demo.card state="{ run() { const n = this.$el; this.$emit('go', { after: () => done() }) } }" tone="warn">`;
        const body = bodyOf(text);
        assert.ok(body.includes('tone="warn"'), 'body was truncated before the last attribute');
        assert.deepStrictEqual(names(body), ['state', 'tone']);
    });

    test('a greater-than comparison in a value does not truncate the tag body', () => {
        const body = bodyOf('<c-demo.card state="{ ok() { return this.n > 0 } }" tone="warn">');
        assert.deepStrictEqual(names(body), ['state', 'tone']);
    });

    test('a Django tag containing > inside a value does not truncate the tag body', () => {
        const body = bodyOf('<c-demo.card hint="{% if a > b %}more{% endif %}" tone="warn">');
        assert.deepStrictEqual(names(body), ['hint', 'tone']);
    });

    test('a > inside a single-quoted value does not truncate the tag body', () => {
        const body = bodyOf(`<c-demo.card config='{"op": "a>b"}' tone="warn">`);
        assert.deepStrictEqual(names(body), ['config', 'tone']);
    });

    test('a multi-line tag is read as one tag', () => {
        const tags = findCottonTags('<c-demo.card\n  size="md"\n  tone="warn">');
        assert.strictEqual(tags.length, 1);
        assert.deepStrictEqual(names(tags[0].body), ['size', 'tone']);
    });

    test('finds every tag in a document', () => {
        const tags = findCottonTags('<c-a.b x="1"><c-c.d y="2" /><c-e.f>');
        assert.deepStrictEqual(tags.map(t => t.name), ['a.b', 'c.d', 'e.f']);
    });

    test('a > inside a Django comment in the body does not end the tag', () => {
        const body = bodyOf('<c-demo.card {# a > b, ojo #} size="md">');
        assert.deepStrictEqual(names(body), ['size']);
    });

    test('index and bodyOffset locate the tag in the original text', () => {
        const text = 'lead\n<c-demo.card size="md">';
        const [tag] = findCottonTags(text);
        assert.strictEqual(text.substring(tag.index, tag.index + 12), '<c-demo.card');
        assert.strictEqual(text.substring(tag.bodyOffset, tag.bodyOffset + tag.body.length), tag.body);
    });

    test('an unterminated tag is skipped rather than swallowing the document', () => {
        assert.deepStrictEqual(findCottonTags('<c-demo.card size="md"\n\n<div>text</div>').map(t => t.name), []);
    });
});

// ── Comment regions ───────────────────────────────────────────────────────
//
// A `<c-tag>` written inside prose is not a usage. The scanner used to read the
// raw document, so `{# ... del <c-...> — Cotton no la interpola #}` produced a
// tag named `...` and a "component not found" error on a sentence.
//
// Annotation comments are the deliberate exception: `{# @prop ... #}` and
// friends ARE Cotton definitions, and a tag named inside one is a real
// reference worth resolving — a hover target, and a stale-docs error when the
// component it names no longer exists.

suite('tag-scanner: comment regions', () => {

    function tagNames(text: string): string[] {
        return findCottonTags(text).map(t => t.name);
    }

    test('a tag inside a plain Django comment is not a usage', () => {
        assert.deepStrictEqual(
            tagNames('{# no metas la variable en el atributo del <c-atoms.card> #}'),
            [],
        );
    });

    test('a tag inside an HTML comment is not a usage', () => {
        assert.deepStrictEqual(tagNames('<!-- ojo: no uses <c-atoms.legacy> aqui -->'), []);
    });

    test('a tag inside a {% comment %} block is not a usage', () => {
        assert.deepStrictEqual(
            tagNames('{% comment %} <c-atoms.viejo> ya no existe {% endcomment %}'),
            [],
        );
    });

    test('a tag inside an @prop annotation IS a usage', () => {
        assert.deepStrictEqual(
            tagNames(`{# @prop icon:text | description:"usa <c-atoms.icon>" #}`),
            ['atoms.icon'],
        );
    });

    test('a tag inside an @description annotation IS a usage', () => {
        assert.deepStrictEqual(
            tagNames('{# @description Un wrapper de <c-atoms.card> #}'),
            ['atoms.card'],
        );
    });

    test('a tag inside an @trigger annotation IS a usage', () => {
        assert.deepStrictEqual(
            tagNames('{# @trigger <c-atoms.button>Open</c-atoms.button> #}'),
            ['atoms.button'],
        );
    });

    test('real usages around a comment are still found', () => {
        const text = '<c-a.one />\n{# olvida <c-a.ignored> #}\n<c-a.two />';
        assert.deepStrictEqual(tagNames(text), ['a.one', 'a.two']);
    });

    test('offsets stay aligned with the original text after skipping a comment', () => {
        const text = '{# <c-a.skipped> #}\n<c-a.real x="1">';
        const [tag] = findCottonTags(text);
        assert.strictEqual(tag.name, 'a.real');
        assert.strictEqual(tag.index, text.indexOf('<c-a.real'));
    });

    test('an unterminated comment swallows the rest rather than emitting tags', () => {
        assert.deepStrictEqual(tagNames('{# olvide cerrar <c-a.one /> <c-a.two />'), []);
    });

    test('a comment inside a tag body does not hide the tag itself', () => {
        assert.deepStrictEqual(tagNames('<c-a.card {# nota #} size="md">'), ['a.card']);
    });
});

suite('tag-scanner: isValidTagName', () => {

    test('accepts plain and dotted names', () => {
        for (const name of ['button', 'atoms.button', 'a.b.c', 'chip-group', 'atoms.chip-group']) {
            assert.strictEqual(isValidTagName(name), true, `expected '${name}' to be valid`);
        }
    });

    // `<c-...>` matches the head pattern because `.` has to be allowed for
    // `atoms.button`, so it arrives here as the name `...`. Reporting it as a
    // component that was not found reads as a missing file; it is malformed.
    test('rejects names built only from dots', () => {
        for (const name of ['...', '.', '..']) {
            assert.strictEqual(isValidTagName(name), false, `expected '${name}' to be invalid`);
        }
    });

    test('rejects leading, trailing and doubled dots', () => {
        for (const name of ['.button', 'button.', 'atoms..button', 'atoms.']) {
            assert.strictEqual(isValidTagName(name), false, `expected '${name}' to be invalid`);
        }
    });

    test('rejects an empty name', () => {
        assert.strictEqual(isValidTagName(''), false);
    });
});
