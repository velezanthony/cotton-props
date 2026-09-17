import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DIAG_CODE } from '../../core/constants';
import {
    extractCVarsInfo,
    checkDuplicateProps,
    checkPropsMissingFromCVars,
    checkDefaultConsistency,
    checkUndocumentedProps,
    checkUnusedProps,
} from '../../core/providers/diagnostics/component-file-checks';
import {
    checkDynamicPrefixMismatch,
    checkEnumDefaultOutOfRange,
    checkMissingCVars,
    checkMissingDescription,
    checkRequiredWithDefault,
    checkTypeDefaultMismatch,
} from '../../core/providers/diagnostics/rules';

/**
 * Every diagnostic needs a `code`. It is what the Problems panel renders next to
 * the source — `cotton-props(duplicate-usage-prop)` — and what lets a
 * user filter to one rule.
 *
 * This is a guard, not a formality. Six codes were declared in DIAG_CODE and
 * never assigned to anything: DUPLICATE_USAGE_PROP, UNKNOWN_PROP,
 * DUPLICATE_PROP, UNUSED_PROP and the two default-sync cases all shipped
 * showing `-`. Assigning a code at ~20 construction sites means one eventually
 * gets missed, so the rule is asserted here instead of trusted.
 */

function makeDoc(text: string): vscode.TextDocument {
    return {
        getText: () => text,
        positionAt: (offset: number) => {
            const before = text.substring(0, offset);
            const lines = before.split('\n');
            return new vscode.Position(lines.length - 1, lines[lines.length - 1].length);
        },
    } as unknown as vscode.TextDocument;
}

const KNOWN_CODES = new Set<string>(Object.values(DIAG_CODE));

/** Assert the check produced something, and that everything it produced is
 *  labelled with a code drawn from DIAG_CODE. */
function assertAllCoded(label: string, diags: vscode.Diagnostic[]): void {
    assert.ok(diags.length > 0, `${label}: fixture produced no diagnostic — the guard would pass vacuously`);
    for (const diag of diags) {
        assert.notStrictEqual(diag.code, undefined, `${label}: "${diag.message}" has no code`);
        assert.ok(
            KNOWN_CODES.has(String(diag.code)),
            `${label}: "${diag.message}" has code '${String(diag.code)}', which is not in DIAG_CODE`,
        );
    }
}

suite('Diagnostics: every finding carries a code', () => {

    test('duplicate @prop definition', () => {
        const text = '{# @prop title:text #}\n{# @prop title:text #}\n<c-vars title="x">';
        assertAllCoded('checkDuplicateProps', checkDuplicateProps(makeDoc(text), text).diagnostics);
    });

    test('@prop missing from <c-vars>', () => {
        const text = '{# @prop title:text #}\n{# @prop other:text #}\n<c-vars other="x">';
        const doc = makeDoc(text);
        const { seenDefs } = checkDuplicateProps(doc, text);
        const cvars = extractCVarsInfo(doc, text)!;
        assertAllCoded('checkPropsMissingFromCVars', checkPropsMissingFromCVars(doc, seenDefs, cvars));
    });

    // The two mirror cases plus the mismatch — one of the three shipped codeless.
    test('default consistency, in all three directions', () => {
        const cases: [string, string][] = [
            ['@prop has a default, <c-vars> does not', '{# @prop title:text | default:"a" #}\n<c-vars title>'],
            ['<c-vars> has a default, @prop does not', '{# @prop title:text #}\n<c-vars title="a">'],
            ['both have one and they disagree', '{# @prop title:text | default:"a" #}\n<c-vars title="b">'],
        ];
        for (const [label, text] of cases) {
            const doc = makeDoc(text);
            const { seenDefs } = checkDuplicateProps(doc, text);
            const cvars = extractCVarsInfo(doc, text)!;
            assertAllCoded(`checkDefaultConsistency — ${label}`, checkDefaultConsistency(doc, seenDefs, cvars));
        }
    });

    test('undocumented <c-vars> attribute', () => {
        const text = '{# @prop title:text #}\n<c-vars title="a" undocumented="b">';
        const doc = makeDoc(text);
        const { seenDefs } = checkDuplicateProps(doc, text);
        const cvars = extractCVarsInfo(doc, text)!;
        assertAllCoded('checkUndocumentedProps', checkUndocumentedProps(doc, seenDefs, cvars));
    });

    test('<c-vars> attribute never used in the template', () => {
        const text = '{# @prop title:text #}\n<c-vars title="a">\n<div>nothing references it</div>';
        const doc = makeDoc(text);
        const cvars = extractCVarsInfo(doc, text)!;
        assertAllCoded('checkUnusedProps', checkUnusedProps(doc, cvars, text));
    });

    test('required-with-default conflict', () => {
        const text = '{# @prop title:text | required | default:"x" #}';
        assertAllCoded('checkRequiredWithDefault', checkRequiredWithDefault(makeDoc(text), text));
    });

    test('type/default mismatch', () => {
        const text = '{# @prop loading:boolean | default:"yes" #}';
        assertAllCoded('checkTypeDefaultMismatch', checkTypeDefaultMismatch(makeDoc(text), text));
    });

    test('enum default out of range', () => {
        const text = `{# @prop variant:select['a','b'] | default:"z" #}`;
        assertAllCoded('checkEnumDefaultOutOfRange', checkEnumDefaultOutOfRange(makeDoc(text), text));
    });

    test('dynamic prefix mismatch', () => {
        const text = '{# @prop :size:text #}\n<c-vars size="md">';
        assertAllCoded('checkDynamicPrefixMismatch', checkDynamicPrefixMismatch(makeDoc(text), text));
    });

    test('missing <c-vars> tag', () => {
        const text = '{# @prop title:text #}\n<div>no c-vars anywhere</div>';
        assertAllCoded('checkMissingCVars', checkMissingCVars(makeDoc(text), text));
    });

    test('missing @prop description', () => {
        const text = '{# @prop title:text #}\n<c-vars title="a">';
        assertAllCoded('checkMissingDescription', checkMissingDescription(makeDoc(text), text));
    });
});

suite('Diagnostics: DIAG_CODE has no dead entries', () => {

    /** Every `.ts` under src/core except the file that declares the codes. */
    function coreSources(): string {
        const root = path.resolve(__dirname, '..', '..', '..', 'src', 'core');
        const out: string[] = [];
        const walk = (dir: string): void => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) { walk(full); }
                else if (entry.name.endsWith('.ts') && entry.name !== 'constants.ts') {
                    out.push(fs.readFileSync(full, 'utf-8'));
                }
            }
        };
        walk(root);
        return out.join('\n');
    }

    // Four constants were declared and never assigned to anything:
    // DUPLICATE_USAGE_PROP, UNKNOWN_PROP, DUPLICATE_PROP and UNUSED_PROP. A code
    // nobody assigns is a rule nobody labelled, which is how they all shipped
    // rendering as `-` in the Problems panel. Reading the sources is the only
    // way to assert this — a runtime check can only see codes that were used.
    test('every DIAG_CODE constant is assigned by some rule', () => {
        const sources = coreSources();
        const orphans = Object.keys(DIAG_CODE).filter(
            name => !new RegExp(`DIAG_CODE\\.${name}\\b`).test(sources),
        );
        assert.deepStrictEqual(orphans, [], `DIAG_CODE entries never assigned: ${orphans.join(', ')}`);
    });

    // docs/REFERENCE.md documents one section per code, anchored on the code
    // itself (`#### \`duplicate-prop\`` → `#duplicate-prop`), so a rule can be
    // linked to directly. Adding a rule without documenting it, or renaming a
    // code and leaving the section behind, breaks that link silently.
    test('every DIAG_CODE has a reference section, and no section is orphaned', () => {
        const reference = fs.readFileSync(
            path.resolve(__dirname, '..', '..', '..', 'docs', 'REFERENCE.md'), 'utf-8',
        );
        const documented = [...reference.matchAll(/^#### `([a-z-]+)`$/gm)].map(m => m[1]);
        const codes = Object.values(DIAG_CODE) as string[];

        assert.deepStrictEqual(
            codes.filter(c => !documented.includes(c)), [],
            'codes with no reference section',
        );
        assert.deepStrictEqual(
            documented.filter(d => !codes.includes(d)), [],
            'reference sections for codes that no longer exist',
        );
    });

    test('DIAG_CODE values are unique', () => {
        // Two rules sharing a string would make the panel's filter ambiguous.
        const values = Object.values(DIAG_CODE);
        assert.strictEqual(new Set(values).size, values.length, 'duplicate DIAG_CODE values');
    });

    test('no code carries the redundant cotton- prefix', () => {
        for (const [name, value] of Object.entries(DIAG_CODE)) {
            assert.ok(
                !value.startsWith('cotton-'),
                `${name} = '${value}': the source already says cotton-props`,
            );
        }
    });
});
