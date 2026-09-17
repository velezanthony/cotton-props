import * as vscode from 'vscode';
import { BUILTIN } from '../constants';
import { findIsAttribute, parseIsAttribute } from '../dynamic-component';
import { findCottonTags, scanTagAttributes } from '../tag-scanner';

/**
 * Refactor actions for switching a tag between its direct form and the
 * `<c-component is="...">` dispatch form:
 *
 *   <c-atoms.button variant="primary">…</c-atoms.button>
 *     ⇅
 *   <c-component is="atoms.button" variant="primary">…</c-component>
 *
 * Useful when a tag that was hardcoded needs to become dynamic, or when a
 * dispatch with a now-static target can be inlined.
 *
 * The provider operates purely on the document text — no scanner lookups —
 * so refactors are available before the workspace finishes indexing.
 */
export class CottonRefactorProvider implements vscode.CodeActionProvider {
    static readonly providedKinds = [vscode.CodeActionKind.RefactorRewrite];

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
    ): vscode.CodeAction[] | undefined {
        const text = document.getText();
        const offset = document.offsetAt(range.start);

        const open = findOpeningTagAt(text, offset);
        if (!open) { return undefined; }

        if (open.tag === BUILTIN.COMPONENT) {
            return convertDispatchToDirectAction(document, text, open);
        }
        return [convertDirectToDispatchAction(document, text, open)];
    }
}

// ── Tag locator ───────────────────────────────────────────────────────────

interface OpenTagMatch {
    tag: string;
    attrs: string;
    /** Document offset of the leading `<`. */
    headStart: number;
    /** Document offset one past the closing `>`. */
    headEnd: number;
    selfClose: boolean;
}

/** Find the `<c-NAME ...>` opening tag whose head contains `offset`.
 *  Returns the first match if multiple overlap (cursor at outer tag).
 *
 *  Uses the shared scanner rather than a `[^>]*?` regex body: a `>` inside an
 *  attribute value (an arrow function, `n > 0`, `{% if a > b %}`) used to end
 *  the head early, so `headEnd` landed mid-value and a cursor past that point
 *  resolved to no tag — silently withholding the refactor. */
export function findOpeningTagAt(text: string, offset: number): OpenTagMatch | undefined {
    for (const tag of findCottonTags(text)) {
        // Half-open interval: [headStart, headEnd). A cursor sitting on the
        // first character of the body (right after `>`) is NOT inside the tag.
        if (offset < tag.index || offset >= tag.end) { continue; }
        return {
            tag: tag.name,
            attrs: tag.body,
            headStart: tag.index,
            headEnd: tag.end,
            selfClose: tag.selfClosing,
        };
    }
    return undefined;
}

/** Depth-aware locator: given an opening at `searchFrom`, return the
 *  position of its paired `</c-NAME>` close. Handles nested same-name tags. */
export function findClosingTag(
    text: string,
    searchFrom: number,
    tag: string,
): { start: number; end: number } | undefined {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`<(/)?c-${escaped}(?![\\w.-])([\\s\\S]*?)>`, 'g');
    re.lastIndex = searchFrom;
    let depth = 1;
    let m;
    while ((m = re.exec(text)) !== null) {
        const isClose = m[1] === '/';
        if (isClose) {
            depth--;
            if (depth === 0) { return { start: m.index, end: m.index + m[0].length }; }
            continue;
        }
        const attrs = m[2] ?? '';
        const selfClose = attrs.trimEnd().endsWith('/');
        if (!selfClose) { depth++; }
    }
    return undefined;
}

// ── Direct → Dispatch ─────────────────────────────────────────────────────

function convertDirectToDispatchAction(
    document: vscode.TextDocument,
    text: string,
    open: OpenTagMatch,
): vscode.CodeAction {
    const action = new vscode.CodeAction(
        `Convert to <c-component is="${open.tag}">`,
        vscode.CodeActionKind.RefactorRewrite,
    );
    const edit = new vscode.WorkspaceEdit();

    // Replace the head: `<c-tag<attrs><self?>>` → `<c-component is="tag"<attrs><self?>>`.
    // We keep <attrs> verbatim — preserve user formatting (newlines, quoting style).
    const headReplacement = `<c-component is="${open.tag}"${open.attrs}${open.selfClose ? ' />' : '>'}`;
    edit.replace(
        document.uri,
        new vscode.Range(document.positionAt(open.headStart), document.positionAt(open.headEnd)),
        headReplacement,
    );

    if (!open.selfClose) {
        const close = findClosingTag(text, open.headEnd, open.tag);
        if (close) {
            edit.replace(
                document.uri,
                new vscode.Range(document.positionAt(close.start), document.positionAt(close.end)),
                '</c-component>',
            );
        }
    }

    action.edit = edit;
    return action;
}

// ── Dispatch → Direct ─────────────────────────────────────────────────────

function convertDispatchToDirectAction(
    document: vscode.TextDocument,
    text: string,
    open: OpenTagMatch,
): vscode.CodeAction[] | undefined {
    const isAttr = findIsAttribute(open.attrs);
    if (!isAttr) { return undefined; }

    const parsed = parseIsAttribute(isAttr.raw, isAttr.isExpression);
    if (parsed.kind !== 'literal') { return undefined; }
    const target = parsed.target;

    const action = new vscode.CodeAction(
        `Inline <c-component is="${target}"> as <c-${target}>`,
        vscode.CodeActionKind.RefactorRewrite,
    );
    const edit = new vscode.WorkspaceEdit();

    const strippedAttrs = stripIsAttribute(open.attrs);
    const headReplacement = `<c-${target}${strippedAttrs}${open.selfClose ? ' />' : '>'}`;
    edit.replace(
        document.uri,
        new vscode.Range(document.positionAt(open.headStart), document.positionAt(open.headEnd)),
        headReplacement,
    );

    if (!open.selfClose) {
        const close = findClosingTag(text, open.headEnd, BUILTIN.COMPONENT);
        if (close) {
            edit.replace(
                document.uri,
                new vscode.Range(document.positionAt(close.start), document.positionAt(close.end)),
                `</c-${target}>`,
            );
        }
    }

    action.edit = edit;
    return [action];
}

/** Remove the first `is="..."` / `:is="..."` attribute from an attribute
 *  string, including its leading whitespace. Preserves the rest verbatim.
 *
 *  Located with the shared scanner so a value holding the opposite quote
 *  character (`is="it's"`) is still found — the previous `[^"']*` pattern
 *  matched nothing there and left the attribute in place. */
export function stripIsAttribute(attrs: string): string {
    for (const attr of scanTagAttributes(attrs)) {
        if (attr.name !== 'is' || attr.kind === 'other') { continue; }
        if (attr.value === undefined) { continue; }
        // Exactly one leading whitespace character, matching the `\s` the
        // previous pattern consumed — separators between the remaining
        // attributes must survive untouched.
        let start = attr.nameOffset;
        if (start > 0 && /\s/.test(attrs[start - 1])) { start--; }
        const quoteLen = attr.quote ? 1 : 0;
        const end = Math.min(attrs.length, attr.valueOffset! + attr.value.length + quoteLen);
        return attrs.substring(0, start) + attrs.substring(end);
    }
    return attrs;
}
