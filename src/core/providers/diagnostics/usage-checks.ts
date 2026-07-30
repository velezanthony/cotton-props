import * as vscode from 'vscode';
import { BUILTIN, BUILTIN_TAGS, COTTON_TAG_PREFIX, EXTENSION_NAME, DIAG_CODE } from '../../constants';
import { findComponentFile, getCachedProps, isStrict } from '../../scanner';
import { findIsAttribute, parseIsAttribute } from '../../dynamic-component';
import { findCottonTags, scanTagAttributes, type CottonTag, type TagAttribute } from '../../tag-scanner';
import type { PropDefinition } from '../../models';
import { attachQuickFix } from './quick-fix-data';
import { nameVariations } from './shared';

/** The key an attribute occupies for duplicate detection. Cotton treats `size`
 *  and `:size` as the same prop, so they collide by design. Framework
 *  attributes (`@click`, `::class`) live in their own namespace keyed by the
 *  literal name, so `@click` can never collide with a prop called `click`. */
function duplicateKey(attr: TagAttribute): string {
    return attr.kind === 'other' ? attr.raw : attr.name;
}

function checkComponentNotFound(document: vscode.TextDocument, tag: string, tagIndex: number): vscode.Diagnostic {
    const start = document.positionAt(tagIndex);
    const end = document.positionAt(tagIndex + `<c-${tag}`.length);
    const diag = new vscode.Diagnostic(
        new vscode.Range(start, end),
        `${EXTENSION_NAME}: component '${tag}' not found`,
        vscode.DiagnosticSeverity.Error,
    );
    diag.code = DIAG_CODE.COMPONENT_NOT_FOUND;
    return diag;
}

export function checkComponentDispatch(
    document: vscode.TextDocument,
    attrsStr: string,
    tagIndex: number,
): vscode.Diagnostic | undefined {
    const isAttr = findIsAttribute(attrsStr);
    if (!isAttr) {
        // `<c-component>` with no `is` attribute fails at Cotton runtime —
        // the dispatcher has no template name to render. Flag the tag head.
        const start = document.positionAt(tagIndex);
        const end = document.positionAt(tagIndex + (COTTON_TAG_PREFIX + BUILTIN.COMPONENT).length);
        const diag = new vscode.Diagnostic(
            new vscode.Range(start, end),
            `${EXTENSION_NAME}: <c-component> requires an 'is' (or ':is') attribute`,
            vscode.DiagnosticSeverity.Error,
        );
        diag.code = DIAG_CODE.MISSING_IS_ATTRIBUTE;
        return diag;
    }

    const parsed = parseIsAttribute(isAttr.raw, isAttr.isExpression);
    if (parsed.kind !== 'literal') { return undefined; }
    if (findComponentFile(parsed.target)) { return undefined; }

    const baseOffset = tagIndex + (COTTON_TAG_PREFIX + BUILTIN.COMPONENT).length;
    const valueOffset = baseOffset + isAttr.valueOffset;
    const diag = new vscode.Diagnostic(
        new vscode.Range(
            document.positionAt(valueOffset),
            document.positionAt(valueOffset + parsed.target.length),
        ),
        `${EXTENSION_NAME}: component '${parsed.target}' not found`,
        vscode.DiagnosticSeverity.Error,
    );
    diag.code = DIAG_CODE.COMPONENT_NOT_FOUND;
    return diag;
}

function checkDeprecatedUsage(
    document: vscode.TextDocument,
    prop: PropDefinition,
    attrName: string,
    tag: string,
    nameIdx: number,
): vscode.Diagnostic {
    const msg = prop.deprecated
        ? `Deprecated prop '${attrName}' on '${tag}': ${prop.deprecated}`
        : `Deprecated prop '${attrName}' on '${tag}'`;
    const diag = new vscode.Diagnostic(
        new vscode.Range(document.positionAt(nameIdx), document.positionAt(nameIdx + attrName.length)),
        msg,
        vscode.DiagnosticSeverity.Hint,
    );
    diag.tags = [vscode.DiagnosticTag.Deprecated];
    diag.code = DIAG_CODE.DEPRECATED_PROP;
    return diag;
}

function checkPropValue(
    prop: PropDefinition,
    attrName: string,
    attrValue: string,
    valueRange: vscode.Range,
): vscode.Diagnostic | null {
    if (prop.type === 'select' && prop.options.length && !prop.options.includes(attrValue)) {
        const diag = new vscode.Diagnostic(
            valueRange,
            `Invalid value '${attrValue}' for '${attrName}'. Expected: ${prop.options.join(', ')}`,
            vscode.DiagnosticSeverity.Error,
        );
        diag.code = DIAG_CODE.INVALID_VALUE;
        return diag;
    }

    if (prop.type === 'boolean' && !['True', 'False', 'true', 'false'].includes(attrValue)) {
        const diag = new vscode.Diagnostic(
            valueRange,
            `Invalid boolean '${attrValue}' for '${attrName}'. Expected: True or False`,
            vscode.DiagnosticSeverity.Error,
        );
        diag.code = DIAG_CODE.INVALID_VALUE;
        return diag;
    }

    if (prop.type === 'number' && isNaN(Number(attrValue))) {
        const diag = new vscode.Diagnostic(
            valueRange,
            `Invalid number '${attrValue}' for '${attrName}'`,
            vscode.DiagnosticSeverity.Error,
        );
        diag.code = DIAG_CODE.INVALID_VALUE;
        return diag;
    }

    return null;
}

function checkRequiredProps(
    document: vscode.TextDocument,
    props: PropDefinition[],
    seenAttrs: Map<string, number>,
    tag: string,
    cottonTag: CottonTag,
): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    for (const prop of props) {
        if (!prop.required) { continue; }
        const isPassed = nameVariations(prop.cleanName).some(v => seenAttrs.has(v));
        if (isPassed) { continue; }

        const start = document.positionAt(cottonTag.index);
        const end = document.positionAt(cottonTag.index + `<c-${tag}`.length);
        const diag = new vscode.Diagnostic(
            new vscode.Range(start, end),
            `Missing required prop '${prop.cleanName}' on '${tag}'`,
            vscode.DiagnosticSeverity.Warning,
        );
        diag.code = DIAG_CODE.MISSING_REQUIRED;
        // Insert right after the last attribute — before a self-closing `/` or
        // the `>`, whichever this tag ends with.
        const insertOffset = cottonTag.bodyOffset + cottonTag.body.length;
        attachQuickFix(diag, {
            kind: 'missing-required',
            propName: prop.cleanName,
            propType: prop.type,
            propDefault: prop.defaultValue,
            insertOffset,
        });
        diagnostics.push(diag);
    }

    return diagnostics;
}

export function validateComponentUsage(document: vscode.TextDocument, text: string): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    for (const cottonTag of findCottonTags(text)) {
        const tag = cottonTag.name;
        const attrsStr = cottonTag.body;

        if (tag === BUILTIN.COMPONENT) {
            const dispatchDiag = checkComponentDispatch(document, attrsStr, cottonTag.index);
            if (dispatchDiag) { diagnostics.push(dispatchDiag); }
            continue;
        }

        if (BUILTIN_TAGS.includes(tag)) { continue; }

        const filePath = findComponentFile(tag);
        if (!filePath) {
            diagnostics.push(checkComponentNotFound(document, tag, cottonTag.index));
            continue;
        }

        const props = getCachedProps(filePath);
        if (!props.length) { continue; }

        const knownNames = new Set(props.map(p => p.cleanName));
        const propMap = new Map(props.map(p => [p.cleanName, p]));
        /** Prop-facing names only — framework attributes must never land here,
         *  or one of them could satisfy a required prop and silence its
         *  missing-required warning. */
        const seenAttrs = new Map<string, number>();
        const seenKeys = new Set<string>();

        for (const attr of scanTagAttributes(attrsStr)) {
            const isDynamic = attr.kind === 'dynamic';
            const attrName = attr.name;
            const attrValue = attr.value ?? '';
            const baseOffset = cottonTag.bodyOffset;
            const nameIdx = baseOffset + attr.nameOffset;
            const key = duplicateKey(attr);

            if (seenKeys.has(key)) {
                diagnostics.push(new vscode.Diagnostic(
                    new vscode.Range(document.positionAt(nameIdx), document.positionAt(nameIdx + attr.raw.length)),
                    `Duplicate prop '${attrName}' on '${tag}'`,
                    vscode.DiagnosticSeverity.Error,
                ));
                continue;
            }
            seenKeys.add(key);

            // `@click`, `::class`, `x-on:click.away` — Cotton passes these
            // through to `attrs` untouched. They are never declared props, so no
            // prop-facing check applies and they must stay out of seenAttrs.
            if (attr.kind === 'other') { continue; }
            seenAttrs.set(attrName, nameIdx);

            if (!knownNames.has(attrName)) {
                if (isStrict(filePath)) {
                    diagnostics.push(new vscode.Diagnostic(
                        new vscode.Range(document.positionAt(nameIdx), document.positionAt(nameIdx + attrName.length)),
                        `Unknown prop '${attrName}' on '${tag}' (@strict mode)`,
                        vscode.DiagnosticSeverity.Warning,
                    ));
                }
                continue;
            }

            const prop = propMap.get(attrName);
            if (!prop) { continue; }

            if (prop.deprecated !== undefined) {
                diagnostics.push(checkDeprecatedUsage(document, prop, attrName, tag, nameIdx));
            }

            if (!attrValue) { continue; }
            if (isDynamic) { continue; }
            if (attrValue.includes('{{') || attrValue.includes('{%')) { continue; }

            const valueIdx = baseOffset + attr.valueOffset!;
            const valueRange = new vscode.Range(
                document.positionAt(valueIdx),
                document.positionAt(valueIdx + attrValue.length),
            );
            const valueDiag = checkPropValue(prop, attrName, attrValue, valueRange);
            if (valueDiag) { diagnostics.push(valueDiag); }
        }

        diagnostics.push(...checkRequiredProps(document, props, seenAttrs, tag, cottonTag));
    }

    return diagnostics;
}
