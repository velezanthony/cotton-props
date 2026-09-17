import * as vscode from 'vscode';
import { COTTON_TAG_RE } from '../constants';
import { findComponentFile, getCachedComponent, getCachedProps } from '../scanner';
import { formatPropSummary, formatPropDocs } from '../formatting';
import { findTagContext } from '../helpers';
import { findCottonTags, scanTagAttributes } from '../tag-scanner';
import { findIsAttributes } from './is-context';
import type { ParsedComponent } from '../models';

/**
 * Pure render function — builds the MarkdownString shown when hovering a
 * `<c-tag>`. Exported so unit tests can exercise the description / slots /
 * trigger sections without spinning up a workspace.
 */
export function buildTagHoverMarkdown(tag: string, parsed: ParsedComponent): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**c-${tag}**`);
    if (parsed.isStrict) { md.appendMarkdown(' · *@strict*'); }
    md.appendMarkdown('\n\n');

    if (parsed.description) {
        md.appendMarkdown(`_${parsed.description}_\n\n`);
    }

    if (parsed.props.length === 0 && parsed.slots.length === 0 && !parsed.trigger && !parsed.description) {
        md.appendMarkdown('*no props or slots defined*');
        return md;
    }

    if (parsed.props.length > 0) {
        md.appendMarkdown('---\n\n**Props**\n\n');
        md.appendMarkdown(parsed.props.map(p => formatPropSummary(p)).join('\n\n'));
        md.appendMarkdown('\n\n');
    }

    if (parsed.slots.length > 0) {
        md.appendMarkdown('---\n\n**Slots**\n\n');
        for (const slot of parsed.slots) {
            const name = slot.name ? `\`:${slot.name}\`` : '*default*';
            const desc = slot.description ? ` — ${slot.description}` : '';
            md.appendMarkdown(`- ${name}${desc}\n`);
        }
        md.appendMarkdown('\n');
    }

    if (parsed.trigger) {
        md.appendMarkdown(`---\n\n**Trigger**\n\n\`${parsed.trigger}\`\n`);
    }

    return md;
}

/**
 * The prop name at `offset`, or `undefined` when the offset is not sitting on a
 * prop name inside a Cotton tag head.
 *
 * Replaces a line-scoped `/\s:?([\w-]+)(?:=["'][^"']*["'])?/g` sweep that had
 * two defects: its value group was optional, so an identifier *inside* an
 * attribute value resolved as a prop name (hovering `title` inside
 * `x-data="{ title: 1 }"` offered the `title` prop's docs), and working line by
 * line meant a multi-line tag declaration was never matched at all.
 *
 * Pure, so the offset arithmetic is unit-tested without a workspace.
 */
export function findPropNameAt(text: string, offset: number): string | undefined {
    for (const tag of findCottonTags(text)) {
        const bodyEnd = tag.bodyOffset + tag.body.length;
        if (offset < tag.bodyOffset || offset > bodyEnd) { continue; }

        for (const attr of scanTagAttributes(tag.body)) {
            // `@click` / `::class` are passed through by Cotton and are never
            // declared props, so there is nothing to hover.
            if (attr.kind === 'other') { continue; }
            // The hoverable span is the bare name; the `:` prefix is not part of it.
            const start = tag.bodyOffset + attr.nameOffset + (attr.kind === 'dynamic' ? 1 : 0);
            const end = start + attr.name.length;
            if (offset >= start && offset <= end) { return attr.name; }
        }
    }
    return undefined;
}

export class HoverProvider implements vscode.HoverProvider {
    provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
        const line = document.lineAt(position.line).text;
        const char = position.character;

        for (const tagMatch of line.matchAll(COTTON_TAG_RE)) {
            if (char >= tagMatch.index! && char <= tagMatch.index! + tagMatch[0].length) {
                return this.hoverTag(tagMatch[1]);
            }
        }

        // `<c-component is="literal-target">` — hover the resolved target.
        // Scan the whole document so multi-line tag declarations are covered.
        const offset = document.offsetAt(position);
        for (const ctx of findIsAttributes(document.getText())) {
            if (offset < ctx.valueStart || offset > ctx.valueEnd) { continue; }
            if (ctx.expression || ctx.hasInterpolation) { return undefined; }
            return this.hoverTag(ctx.value);
        }

        const propName = findPropNameAt(document.getText(), offset);
        if (propName !== undefined) {
            const tag = findTagContext(document, offset);
            if (tag) { return this.hoverProp(tag, propName); }
        }

        return undefined;
    }

    private hoverTag(tag: string): vscode.Hover | undefined {
        const filePath = findComponentFile(tag);
        if (!filePath) { return undefined; }
        return new vscode.Hover(buildTagHoverMarkdown(tag, getCachedComponent(filePath)));
    }

    private hoverProp(tag: string, attrName: string): vscode.Hover | undefined {
        const filePath = findComponentFile(tag);
        if (!filePath) { return undefined; }

        const props = getCachedProps(filePath);
        const prop = props.find(p => p.cleanName === attrName);
        if (!prop) { return undefined; }

        const docs = formatPropDocs(prop);
        docs.appendMarkdown(`\n\n*Component: c-${tag}*`);
        return new vscode.Hover(docs);
    }
}
