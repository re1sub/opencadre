import { Editor } from "@tiptap/core";
import BubbleMenu from "@tiptap/extension-bubble-menu";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { For, onCleanup, onMount, splitProps } from "solid-js";
import { bubbleMenu } from "./editorBubbleMenu.css";
import { editor } from "./markdownEditor.css";
import "#assets/css/github-markdown.css";
import Document from "@tiptap/extension-document";
import { Placeholder } from "@tiptap/extension-placeholder";

interface MarkdownEditorProps {
	content: string;
	class?: string;
	editable?: boolean;
	onUpdate?: (markdown: string) => void;
}

interface ToolbarButton {
	id: string;
	icon: string;
	label: string;
}

const inlineButtons: ToolbarButton[] = [
	{ id: "bold", icon: "bold", label: "Bold" },
	{ id: "italic", icon: "italic", label: "Italic" },
	{ id: "strike", icon: "strikethrough", label: "Strikethrough" },
	{ id: "underline", icon: "underline", label: "Underline" },
	{ id: "code", icon: "code", label: "Inline code" },
	{ id: "link", icon: "link", label: "Link" },
];

const blockButtons: ToolbarButton[] = [
	{ id: "heading-1", icon: "heading-1", label: "Heading 1" },
	{ id: "heading-2", icon: "heading-2", label: "Heading 2" },
	{ id: "heading-3", icon: "heading-3", label: "Heading 3" },
	{ id: "paragraph", icon: "pilcrow", label: "Paragraph" },
	{ id: "bullet-list", icon: "list", label: "Bullet list" },
	{ id: "ordered-list", icon: "list-ordered", label: "Ordered list" },
	{ id: "blockquote", icon: "quote", label: "Blockquote" },
	{ id: "code-block", icon: "square-code", label: "Code block" },
];

export default function MarkdownEditor(props: MarkdownEditorProps) {
	const [local, rest] = splitProps(props, ["class"]);

	let editorRef: HTMLDivElement | undefined;
	let menuRef: HTMLDivElement | undefined;
	let instance: Editor | undefined;

	const CustomDocument = Document.extend({
		content: "heading block*",
	});

	onMount(() => {
		if (!editorRef || !menuRef) return;

		instance = new Editor({
			element: editorRef,
			extensions: [
				CustomDocument,
				StarterKit.configure({
					document: false,
					trailingNode: false,
				}),
				Placeholder.configure({
					placeholder: ({ node, pos }) => {
						if (node.type.name === "heading" && pos === 0) {
							return "Type a title...";
						}
						return "";
					},
					showOnlyCurrent: false,
				}),
				Markdown,
				BubbleMenu.configure({
					element: menuRef,
					pluginKey: "editorBubbleMenu",
					appendTo: () => document.body,
					options: { strategy: "fixed", placement: "top", offset: 8 },
				}),
			],
			content: props.content.trim() ? props.content : "#",
			contentType: "markdown",
			editable: props.editable ?? true,
			onUpdate: ({ editor: editorInstance }) => {
				props.onUpdate?.(editorInstance.getMarkdown());
			},
		});

		const editorInstance = instance;
		const menu = menuRef;

		const actions: Record<string, { active: () => boolean; run: () => void }> =
			{
				bold: {
					active: () => editorInstance.isActive("bold"),
					run: () => editorInstance.chain().focus().toggleBold().run(),
				},
				italic: {
					active: () => editorInstance.isActive("italic"),
					run: () => editorInstance.chain().focus().toggleItalic().run(),
				},
				strike: {
					active: () => editorInstance.isActive("strike"),
					run: () => editorInstance.chain().focus().toggleStrike().run(),
				},
				underline: {
					active: () => editorInstance.isActive("underline"),
					run: () => editorInstance.chain().focus().toggleUnderline().run(),
				},
				code: {
					active: () => editorInstance.isActive("code"),
					run: () => editorInstance.chain().focus().toggleCode().run(),
				},
				link: {
					active: () => editorInstance.isActive("link"),
					run: () =>
						editorInstance.isActive("link")
							? editorInstance.chain().focus().unsetLink().run()
							: editorInstance
									.chain()
									.focus()
									.setLink({ href: "https://" })
									.run(),
				},
				"heading-1": {
					active: () => editorInstance.isActive("heading", { level: 1 }),
					run: () =>
						editorInstance.chain().focus().toggleHeading({ level: 1 }).run(),
				},
				"heading-2": {
					active: () => editorInstance.isActive("heading", { level: 2 }),
					run: () =>
						editorInstance.chain().focus().toggleHeading({ level: 2 }).run(),
				},
				"heading-3": {
					active: () => editorInstance.isActive("heading", { level: 3 }),
					run: () =>
						editorInstance.chain().focus().toggleHeading({ level: 3 }).run(),
				},
				paragraph: {
					active: () => editorInstance.isActive("paragraph"),
					run: () => editorInstance.chain().focus().setParagraph().run(),
				},
				"bullet-list": {
					active: () => editorInstance.isActive("bulletList"),
					run: () => editorInstance.chain().focus().toggleBulletList().run(),
				},
				"ordered-list": {
					active: () => editorInstance.isActive("orderedList"),
					run: () => editorInstance.chain().focus().toggleOrderedList().run(),
				},
				blockquote: {
					active: () => editorInstance.isActive("blockquote"),
					run: () => editorInstance.chain().focus().toggleBlockquote().run(),
				},
				"code-block": {
					active: () => editorInstance.isActive("codeBlock"),
					run: () => editorInstance.chain().focus().toggleCodeBlock().run(),
				},
			};

		const sync = () => {
			for (const button of [...inlineButtons, ...blockButtons]) {
				const el = menu.querySelector<HTMLButtonElement>(`#${button.id}`);
				if (!el) continue;
				const action = actions[button.id];
				if (!action) continue;
				el.classList.toggle("bubble-menu-is-active", action.active());
			}
		};

		menu.querySelectorAll("wa-button").forEach((button) => {
			const id = button.id;
			const action = actions[id];
			if (!action) return;
			button.addEventListener("click", action.run);
		});

		editorInstance.on("transaction", sync);
		editorInstance.on("selectionUpdate", sync);
		sync();
	});

	onCleanup(() => {
		instance?.destroy();
		instance = undefined;
	});

	return (
		<>
			<div
				{...rest}
				ref={editorRef}
				class={editor}
				classList={{
					"markdown-body": true,
					[local.class ?? ""]: Boolean(local.class),
				}}
			/>
			<div
				ref={menuRef}
				class={bubbleMenu}
				role="toolbar"
				aria-label="Text formatting"
			>
				<For each={inlineButtons}>
					{(button) => (
						<>
							<wa-button id={button.id} size="s" appearance="plain">
								<wa-icon name={button.icon} label={button.label} />
							</wa-button>
							<wa-tooltip for={button.id}>{button.label}</wa-tooltip>
						</>
					)}
				</For>
				<wa-divider orientation="vertical"></wa-divider>
				<For each={blockButtons}>
					{(button) => (
						<>
							<wa-button id={button.id} size="s" appearance="plain">
								<wa-icon name={button.icon} label={button.label} />
							</wa-button>
							<wa-tooltip for={button.id}>{button.label}</wa-tooltip>
						</>
					)}
				</For>
			</div>
		</>
	);
}
