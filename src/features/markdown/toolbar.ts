import type { Editor } from "@tiptap/core";
import type { MarkdownAction, ToolbarButtonDef } from "./types";

export type { MarkdownAction, ToolbarButtonDef };

export const inlineButtons: ToolbarButtonDef[] = [
	{ id: "bold", icon: "bold", label: "Bold" },
	{ id: "italic", icon: "italic", label: "Italic" },
	{ id: "strike", icon: "strikethrough", label: "Strikethrough" },
	{ id: "underline", icon: "underline", label: "Underline" },
	{ id: "code", icon: "code", label: "Inline code" },
	{ id: "link", icon: "link", label: "Link" },
];

export const headingItems: ToolbarButtonDef[] = [
	{ id: "paragraph", icon: "pilcrow", label: "Paragraph" },
	{ id: "heading-1", icon: "heading-1", label: "Heading 1" },
	{ id: "heading-2", icon: "heading-2", label: "Heading 2" },
	{ id: "heading-3", icon: "heading-3", label: "Heading 3" },
];

export const blockButtons: ToolbarButtonDef[] = [
	{ id: "bullet-list", icon: "list", label: "Bullet list" },
	{ id: "ordered-list", icon: "list-ordered", label: "Ordered list" },
	{ id: "blockquote", icon: "quote", label: "Blockquote" },
	{ id: "code-block", icon: "square-code", label: "Code block" },
];

export const additionalButtons: ToolbarButtonDef[] = [
	{ id: "comment", icon: "message-square-text", label: "Comment" },
	{ id: "ai", icon: "sparkles", label: "AI" },
];

export const toolbarGroups: ToolbarButtonDef[][] = [
	inlineButtons,
	headingItems,
	blockButtons,
];

export const slashCommandGroups: ToolbarButtonDef[][] = [
	...toolbarGroups,
	[{ id: "ai", icon: "sparkles", label: "AI" }],
];

export const bubbleToolbarGroups: ToolbarButtonDef[][] = [
	...toolbarGroups,
	additionalButtons,
];

export function createMarkdownActions(
	editor: (() => Editor | undefined) | Editor | undefined,
): Record<string, MarkdownAction> {
	const getEditor = () => (typeof editor === "function" ? editor() : editor);

	return {
		bold: {
			run: () => getEditor()?.chain().focus().toggleBold().run(),
			active: () => getEditor()?.isActive("bold") ?? false,
		},
		italic: {
			run: () => getEditor()?.chain().focus().toggleItalic().run(),
			active: () => getEditor()?.isActive("italic") ?? false,
		},
		strike: {
			run: () => getEditor()?.chain().focus().toggleStrike().run(),
			active: () => getEditor()?.isActive("strike") ?? false,
		},
		underline: {
			run: () => getEditor()?.chain().focus().toggleUnderline().run(),
			active: () => getEditor()?.isActive("underline") ?? false,
		},
		code: {
			run: () => getEditor()?.chain().focus().toggleCode().run(),
			active: () => getEditor()?.isActive("code") ?? false,
		},
		link: {
			run: () => {
				const e = getEditor();
				if (!e) return;
				if (e.isActive("link")) {
					e.chain().focus().unsetLink().run();
					return;
				}
				const { from, to, empty } = e.state.selection;
				if (empty) {
					const pos = from;
					const placeholder = "https://";

					e.chain()
						.focus()
						.insertContent(placeholder)
						.setTextSelection({ from: pos, to: pos + 8 })
						.setLink({
							href: placeholder,
							target: "_blank",
							rel: "noopener noreferrer",
							title: placeholder,
						})
						.setTextSelection({ from: pos + 8, to: pos + 8 })
						.run();
					return;
				}
				const text = e.state.doc.textBetween(from, to, " ");
				const formattedText = text.startsWith("http")
					? text
					: `https://${text}`;
				if (text) {
					e.chain()
						.focus()
						.setLink({
							href: formattedText,
							target: "_blank",
							rel: "noopener noreferrer",
							title: formattedText,
						})
						.insertContent(text)
						.run();
				}
			},
			active: () => {
				const e = getEditor();
				if (!e) return false;

				const { $from } = e.state.selection;
				const char = $from.parent.textContent[$from.parentOffset];
				if (!char || /\s/.test(char)) return false;
				return $from.marks().some((m) => m.type.name === "link");
			},
		},
		paragraph: {
			run: () => getEditor()?.chain().focus().setParagraph().run(),
			active: () => getEditor()?.isActive("paragraph") ?? false,
		},
		"heading-1": {
			run: () => getEditor()?.chain().focus().toggleHeading({ level: 2 }).run(),
			active: () => getEditor()?.isActive("heading", { level: 2 }) ?? false,
		},
		"heading-2": {
			run: () => getEditor()?.chain().focus().toggleHeading({ level: 3 }).run(),
			active: () => getEditor()?.isActive("heading", { level: 3 }) ?? false,
		},
		"heading-3": {
			run: () => getEditor()?.chain().focus().toggleHeading({ level: 4 }).run(),
			active: () => getEditor()?.isActive("heading", { level: 4 }) ?? false,
		},
		"bullet-list": {
			run: () => getEditor()?.chain().focus().toggleBulletList().run(),
			active: () => getEditor()?.isActive("bulletList") ?? false,
		},
		"ordered-list": {
			run: () => getEditor()?.chain().focus().toggleOrderedList().run(),
			active: () => getEditor()?.isActive("orderedList") ?? false,
		},
		blockquote: {
			run: () => getEditor()?.chain().focus().toggleBlockquote().run(),
			active: () => getEditor()?.isActive("blockquote") ?? false,
		},
		"code-block": {
			run: () => getEditor()?.chain().focus().toggleCodeBlock().run(),
			active: () => getEditor()?.isActive("codeBlock") ?? false,
		},
	};
}
