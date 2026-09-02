import { Editor, posToDOMRect } from "@tiptap/core";
import BubbleMenu from "@tiptap/extension-bubble-menu";
import Document from "@tiptap/extension-document";
import Heading from "@tiptap/extension-heading";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { createSignal, onCleanup, onMount, splitProps } from "solid-js";
import { Motion } from "solid-motionone";
import AiPopup from "#/features/ai/components/AiPopup";
import { useAuth } from "#/features/auth/AuthContext";
import { usePageCommentsAdapter } from "#/features/comments/hooks/usePageCommentsAdapter";
import {
	COMMENT_MARK_NAME,
	CommentMark,
} from "#/features/comments/mark/CommentMark";
import CommentPopup from "./components/CommentPopup";
import { bubbleMenu, bubbleMenuContent } from "./editorBubbleMenu.css";
import { useEditorComments } from "./hooks/useEditorComments";
import { useSlashCommand } from "./hooks/useSlashCommand";
import { insertMarkdown } from "./insertMarkdown";
import { editor } from "./markdownEditor.css";
import {
	bubbleToolbarGroups,
	createMarkdownActions,
	type MarkdownAction,
} from "./toolbar";
import "#assets/css/github-markdown.css";
import EditorMenuItems from "./components/EditorMenuItems";

interface MarkdownEditorProps {
	content: string;
	class?: string;
	editable?: boolean;
	pageId?: string;
	onUpdate?: (markdown: string) => void;
}

const MarkdownEditor = (props: MarkdownEditorProps) => {
	const [local, rest] = splitProps(props, [
		"class",
		"content",
		"editable",
		"pageId",
		"onUpdate",
	]);
	const { user } = useAuth();
	const pageComments = usePageCommentsAdapter(() => props.pageId ?? "");

	let instance: Editor | undefined;
	const slashCommand = useSlashCommand(() => instance);
	const editorComments = useEditorComments(pageComments);

	const [toolbarVersion, setToolbarVersion] = createSignal(0);
	const [bubbleVisible, setBubbleVisible] = createSignal(false);
	const [aiRect, setAiRect] = createSignal<DOMRect | null>(null);

	const bumpToolbar = () => setToolbarVersion((v) => v + 1);
	const author = () => user()?.email?.split("@")[0] ?? "You";

	let editorRef!: HTMLDivElement;
	let menuRef!: HTMLDivElement;
	let commandMenuRef!: HTMLDivElement;
	let actions: Record<string, MarkdownAction> = {};

	const isActive = (id: string) => {
		toolbarVersion();
		return actions[id]?.active() ?? false;
	};

	const hideBubbleMenus = () => {
		setBubbleVisible(false);
		slashCommand.setCommandVisible(false);
		instance?.view.dispatch(
			instance.state.tr
				.setMeta("editorBubbleMenu", "hide")
				.setMeta("editorCommandMenu", "hide"),
		);
	};

	const handleAiInsert = (text: string) => {
		if (!text || !instance) return;
		insertMarkdown(instance, text);
		setAiRect(null);
	};

	onMount(() => {
		if (!editorRef || !menuRef || !commandMenuRef) return;

		const commonMenuOptions = {
			strategy: "fixed" as const,
			placement: "bottom-start" as const,
			offset: 8,
			flip: { boundary: editorRef, padding: -50 },
			shift: { boundary: editorRef },
		};

		const CustomDocument = Document.extend({
			content: "heading block*",
		});

		// Fixes 'Duplicate extension names found' warning
		const selectBubbleMenu = BubbleMenu.extend({ name: "editorBubbleMenu" });
		const slashCommandMenu = BubbleMenu.extend({ name: "editorCommandMenu" });

		instance = new Editor({
			element: editorRef,
			extensions: [
				CustomDocument,
				StarterKit.configure({
					document: false,
					trailingNode: false,
					heading: false,
					// link: {
					// 	HTMLAttributes: {
					// 		title: "my-custom-title",
					// 	},
					// },
				}),
				Placeholder.configure({
					placeholder: ({ node, pos }) => {
						if (node.type.name === "heading" && pos === 0) return "Heading 1";
						if (node.type.name === "paragraph") return "Press / for commands";
						return "";
					},
					showOnlyCurrent: false,
				}),
				Markdown.configure({ markedOptions: { gfm: true } }),
				Heading.configure({ levels: [2, 3, 4, 5, 6] }),
				CommentMark,
				selectBubbleMenu.configure({
					element: menuRef,
					pluginKey: "editorBubbleMenu",
					appendTo: () => document.body,
					options: {
						...commonMenuOptions,
						onShow: () => setBubbleVisible(true),
						onHide: () => setBubbleVisible(false),
					},
				}),
				slashCommandMenu.configure({
					element: commandMenuRef,
					pluginKey: "editorCommandMenu",
					appendTo: () => document.body,
					shouldShow: () => slashCommand.commandVisible(),
					options: {
						...commonMenuOptions,
						onShow: () => slashCommand.setCommandVisible(true),
						onHide: () => slashCommand.setCommandVisible(false),
					},
				}),
			],
			content: props.content.trim() ? props.content : "#\n",
			contentType: "markdown",
			editable: props.editable ?? true,
			onUpdate: ({ editor: editorInstance }) => {
				props.onUpdate?.(editorInstance.getMarkdown());
				editorComments.pruneOrphanThreads(editorInstance);
			},
			editorProps: {
				handleTextInput: (view, from, _to, text) => {
					if (text === "/") {
						const before =
							from > 0 ? view.state.doc.textBetween(from - 1, from) : "";
						if (before === "" || /\s/.test(before)) {
							slashCommand.setCommandVisible(true);
							slashCommand.setCommandQuery("");
						}
					}
				},
				handleKeyDown: (_view, event) =>
					slashCommand.handleKeyDown(event, actions),
			},
			onSelectionUpdate: ({ editor }) => {
				const query = slashCommand.getSlashQuery(editor);
				if (query !== null) {
					slashCommand.setCommandQuery(query);
					if (!slashCommand.commandVisible()) {
						slashCommand.setCommandVisible(true);
					}
				} else {
					slashCommand.setCommandVisible(false);
					slashCommand.setCommandQuery("");
				}
			},
		});

		actions = {
			...createMarkdownActions(instance),
			comment: {
				active: () => instance?.isActive(COMMENT_MARK_NAME) ?? false,
				run: () => {
					if (instance)
						editorComments.handleCommentAction(instance, hideBubbleMenus);
				},
			},
			ai: {
				active: () => false,
				run: () => {
					if (!instance) return;
					const { from, to } = instance.state.selection;
					const rect = posToDOMRect(instance.view, from, to);
					hideBubbleMenus();
					if (aiRect()) {
						setAiRect(null);
					} else {
						setAiRect(rect);
					}
				},
			},
		};

		instance.on("transaction", bumpToolbar);
		instance.on("selectionUpdate", bumpToolbar);
		bumpToolbar();
	});

	onCleanup(() => {
		instance?.destroy();
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
				ref={commandMenuRef}
				class={bubbleMenu}
				role="toolbar"
				aria-label="Command menu"
			>
				<Motion.div
					class={bubbleMenuContent}
					style={{
						"grid-template-columns": "1fr",
						"max-height": "200px",
						overflow: "auto",
						"justify-items": "start",
					}}
					animate={{
						opacity: slashCommand.commandVisible() ? 1 : 0,
						scale: slashCommand.commandVisible() ? 1 : 0.95,
					}}
					transition={{ duration: 0.2 }}
				>
					<EditorMenuItems
						groups={slashCommand.filteredToolbarGroups()}
						showLabels
						isCommandMenu
						selectedIndex={slashCommand.selectedIndex()}
						actions={actions}
						isActive={isActive}
						onExecuteCommand={(id) => slashCommand.executeCommand(id, actions)}
					/>
				</Motion.div>
			</div>

			<div
				ref={menuRef}
				class={bubbleMenu}
				role="toolbar"
				aria-label="Text formatting"
			>
				<Motion.div
					class={bubbleMenuContent}
					animate={{
						opacity: bubbleVisible() ? 1 : 0,
						scale: bubbleVisible() ? 1 : 0.95,
					}}
					transition={{ duration: 0.2 }}
				>
					<EditorMenuItems
						groups={bubbleToolbarGroups}
						getAction={(id) => actions[id]}
						isActive={isActive}
					/>
				</Motion.div>
			</div>

			<AiPopup
				open={() => Boolean(aiRect())}
				anchorRect={aiRect}
				onInsert={handleAiInsert}
				onClose={() => setAiRect(null)}
			/>

			<CommentPopup
				open={() => Boolean(editorComments.activeThreadId())}
				anchorRect={editorComments.popupRect}
				thread={editorComments.activeThread}
				author={author()}
				isPopup={true}
				onReplaceComments={(comments) => {
					const id = editorComments.activeThreadId();
					if (!id) return;
					const pending = editorComments.pendingComment();
					if (pending && pending.threadId === id) {
						const wasEmpty =
							pageComments.threads().find((t) => t.id === id)?.comments
								.length === 0;
						if (wasEmpty && comments.length > 0) {
							instance
								?.chain()
								.setTextSelection({ from: pending.from, to: pending.to })
								.setComment(id)
								.run();
							editorComments.setPendingComment(null);
						}
					}
					pageComments.replaceThreadComments(id, comments);
				}}
				onDeleteComment={(commentId) => {
					const id = editorComments.activeThreadId();
					if (id) pageComments.deleteComment(id, commentId);
				}}
				onClose={editorComments.closeThreadPopup}
			/>
		</>
	);
};

export default MarkdownEditor;
