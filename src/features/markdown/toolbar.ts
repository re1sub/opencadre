import type { Editor } from "@tiptap/core";

export interface ToolbarButton {
	id: string;
	icon: string;
	label: string;
}

export interface MarkdownAction {
	active: () => boolean;
	run: () => void;
}

export const inlineButtons: ToolbarButton[] = [
	{ id: "bold", icon: "bold", label: "Bold" },
	{ id: "italic", icon: "italic", label: "Italic" },
	{ id: "strike", icon: "strikethrough", label: "Strikethrough" },
	{ id: "underline", icon: "underline", label: "Underline" },
	{ id: "code", icon: "code", label: "Inline code" },
	{ id: "link", icon: "link", label: "Link" },
];

export const headingItems: ToolbarButton[] = [
	{ id: "paragraph", icon: "pilcrow", label: "Paragraph" },
	{ id: "heading-1", icon: "heading-1", label: "Heading 1" },
	{ id: "heading-2", icon: "heading-2", label: "Heading 2" },
	{ id: "heading-3", icon: "heading-3", label: "Heading 3" },
];

export const blockButtons: ToolbarButton[] = [
	{ id: "bullet-list", icon: "list", label: "Bullet list" },
	{ id: "ordered-list", icon: "list-ordered", label: "Ordered list" },
	{ id: "blockquote", icon: "quote", label: "Blockquote" },
	{ id: "code-block", icon: "square-code", label: "Code block" },
];

export const createMarkdownActions = (
	editor: Editor,
): Record<string, MarkdownAction> => ({
	bold: {
		active: () => editor.isActive("bold"),
		run: () => editor.chain().focus().toggleBold().run(),
	},
	italic: {
		active: () => editor.isActive("italic"),
		run: () => editor.chain().focus().toggleItalic().run(),
	},
	strike: {
		active: () => editor.isActive("strike"),
		run: () => editor.chain().focus().toggleStrike().run(),
	},
	underline: {
		active: () => editor.isActive("underline"),
		run: () => editor.chain().focus().toggleUnderline().run(),
	},
	code: {
		active: () => editor.isActive("code"),
		run: () => editor.chain().focus().toggleCode().run(),
	},
	link: {
		active: () => editor.isActive("link"),
		run: () =>
			editor.isActive("link")
				? editor.chain().focus().unsetLink().run()
				: editor.chain().focus().setLink({ href: "https://" }).run(),
	},
	paragraph: {
		active: () => editor.isActive("paragraph"),
		run: () => editor.chain().focus().setParagraph().run(),
	},
	"heading-1": {
		active: () => editor.isActive("heading", { level: 1 }),
		run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
	},
	"heading-2": {
		active: () => editor.isActive("heading", { level: 2 }),
		run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
	},
	"heading-3": {
		active: () => editor.isActive("heading", { level: 3 }),
		run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
	},
	"bullet-list": {
		active: () => editor.isActive("bulletList"),
		run: () => editor.chain().focus().toggleBulletList().run(),
	},
	"ordered-list": {
		active: () => editor.isActive("orderedList"),
		run: () => editor.chain().focus().toggleOrderedList().run(),
	},
	blockquote: {
		active: () => editor.isActive("blockquote"),
		run: () => editor.chain().focus().toggleBlockquote().run(),
	},
	"code-block": {
		active: () => editor.isActive("codeBlock"),
		run: () => editor.chain().focus().toggleCodeBlock().run(),
	},
});
