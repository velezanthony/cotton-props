import * as vscode from 'vscode';
import { BUILTIN_TAGS } from '../constants';
import { findCottonTags, scanTagAttributes } from '../tag-scanner';
import { findComponentFile, getCachedProps } from '../scanner';

export class CottonInlayHintsProvider implements vscode.InlayHintsProvider {

    private readonly _onDidChangeInlayHints = new vscode.EventEmitter<void>();
    /** VS Code caches hints and won't re-query on a settings change on its own;
     *  firing this event is the only way to re-render when the toggle flips. */
    readonly onDidChangeInlayHints = this._onDidChangeInlayHints.event;

    refresh(): void { this._onDidChangeInlayHints.fire(); }

    provideInlayHints(document: vscode.TextDocument, range: vscode.Range): vscode.InlayHint[] {
        const config = vscode.workspace.getConfiguration('djangoCottonProps');
        if (!config.get<boolean>('inlayHints.showDefaults', true)) { return []; }

        const hints: vscode.InlayHint[] = [];
        const fullText = document.getText();
        const startOffset = document.offsetAt(range.start);
        const endOffset = document.offsetAt(range.end);

        for (const cottonTag of findCottonTags(fullText)) {
            if (cottonTag.index < startOffset) { continue; }
            if (cottonTag.index > endOffset) { break; }

            const tag = cottonTag.name;
            if (BUILTIN_TAGS.includes(tag)) { continue; }

            const attrsStr = cottonTag.body;
            const selfClosing = cottonTag.selfClosing;

            const filePath = findComponentFile(tag);
            if (!filePath) { continue; }

            const props = getCachedProps(filePath);
            if (!props.length) { continue; }

            const passed = collectPassedAttrs(attrsStr);

            const insertOffset = cottonTag.bodyOffset + attrsStr.length;
            const position = document.positionAt(insertOffset);

            for (const prop of props) {
                if (!prop.hasDefault) { continue; }
                if (prop.hidden) { continue; }
                if (prop.deprecated !== undefined) { continue; }
                if (passed.has(prop.cleanName)) { continue; }

                const label = ` ${prop.cleanName}=${formatDefault(prop)}`;
                const hint = new vscode.InlayHint(position, label, vscode.InlayHintKind.Parameter);
                hint.paddingLeft = !selfClosing;
                hint.tooltip = new vscode.MarkdownString(`Default value for \`${prop.cleanName}\` (type: ${prop.type})`);
                hints.push(hint);
            }
        }

        return hints;
    }
}

/** Which props the author already wrote, so their default hint is suppressed.
 *  Only prop-shaped attributes count: a framework attribute like `@click` can
 *  never be the prop `click`, and letting one in would hide a real default. */
function collectPassedAttrs(attrsStr: string): Set<string> {
    const passed = new Set<string>();
    for (const attr of scanTagAttributes(attrsStr)) {
        if (attr.kind === 'other') { continue; }
        passed.add(attr.name);
    }
    return passed;
}

function formatDefault(prop: { type: string; defaultValue: string }): string {
    if (prop.type === 'boolean' || prop.type === 'number') {
        return prop.defaultValue;
    }
    return `"${prop.defaultValue}"`;
}
