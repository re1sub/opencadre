import type { Editor } from "@tiptap/core";

/**
 * Insert markdown into a TipTap editor at the current selection.
 *
 * Inserts the parsed block content (not a doc-wrapped node) so editors whose
 * document schema is stricter than `block+` (e.g. `heading block*`) accept markdown
 * that doesn't begin with the schema's required first node type.
 */
export function insertMarkdown(editor: Editor, markdown: string): void {
	const parsed = editor.markdown?.parse(markdown);
	if (!parsed?.content || parsed.content.length === 0) return;
	editor.chain().focus().insertContent(parsed.content).run();
}
