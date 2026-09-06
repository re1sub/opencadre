import { Editor, posToDOMRect } from "@tiptap/core";
import BubbleMenu from "@tiptap/extension-bubble-menu";
import Collaboration from "@tiptap/extension-collaboration";
import Document from "@tiptap/extension-document";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { createEffect, createSignal, onCleanup, splitProps } from "solid-js";
import { Motion } from "solid-motionone";
import AiPopup from "#/features/ai/components/AiPopup";
import { useCommentsAdapter } from "#/features/comments/hooks/useCommentsAdapter";
import {
	COMMENT_MARK_NAME,
	CommentMark,
} from "#/features/comments/mark/CommentMark";
import { useWorkspaceMembersAdapter } from "#/features/workspace/hooks/useWorkspaceMembersAdapter";
import { useDebouncedPush } from "#/utils/realtime/useDebouncedPush";
import { useYjsDoc } from "#/utils/yjs/useYjsDoc";
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
	workspaceId?: string;
	onUpdate?: (markdown: string) => void;
}

const MarkdownEditor = (props: MarkdownEditorProps) => {
	const [local, rest] = splitProps(props, [
		"class",
		"content",
		"editable",
		"pageId",
		"workspaceId",
		"onUpdate",
	]);
	const pageComments = useCommentsAdapter(() =>
		props.pageId ? { type: "page" as const, id: props.pageId } : null,
	);
	const { myRole } = useWorkspaceMembersAdapter(() => props.workspaceId ?? "");

	const yjs = useYjsDoc({
		entityType: () => "markdown",
		entityId: () => props.pageId ?? "",
		workspaceId: () => props.workspaceId ?? "",
	});

	let instance: Editor | undefined;
	const slashCommand = useSlashCommand(() => instance);
	const editorComments = useEditorComments(pageComments);

	const [toolbarVersion, setToolbarVersion] = createSignal(0);
	const [bubbleVisible, setBubbleVisible] = createSignal(false);
	const [aiRect, setAiRect] = createSignal<DOMRect | null>(null);

	const { setPush, push } = useDebouncedPush(400);
	let mdRef = props.content;
	createEffect(() => {
		setPush(() => {
			props.onUpdate?.(mdRef);
		});
	});
	const bumpToolbar = () => setToolbarVersion((v) => v + 1);

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

	createEffect(() => {
		if (!editorRef || !menuRef || !commandMenuRef) return;
		if (!yjs.loaded() || !yjs.doc()) return;
		if (instance) return;

		const yDoc = yjs.doc()!;

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
					trailingNode: { node: "paragraph" },
					undoRedo: false,
				}),
				Placeholder.configure({
					placeholder: ({ node, pos }) => {
						if (node.type.name === "heading" && pos === 0) return "Heading 1";
						if (node.type.name === "paragraph") return "Press / for commands";
						return "";
					},
					showOnlyCurrent: true,
				}),
				Markdown.configure({ markedOptions: { gfm: true } }),
				CommentMark,
				Collaboration.configure({
					document: yDoc,
				}),
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
			onUpdate: ({ editor: editorInstance, transaction }) => {
				// Prevent saving remote changes back as if they were local
				const isRemote = transaction.getMeta("ySync");
				if (isRemote) return;

				const md = editorInstance.getMarkdown();
				if (md === mdRef) return;
				mdRef = md;
				push();
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
				handleClickOn: (view, pos, _node, _nodePos, event) => {
					const target = event.target as HTMLElement;
					const markEl = target.closest?.("mark[data-comment-id]");
					if (markEl) {
						const threadId = markEl.getAttribute("data-comment-id");
						if (threadId) {
							const rect = markEl.getBoundingClientRect();
							if (editorComments.activeThreadId() === threadId) {
								editorComments.closeThreadPopup();
							} else {
								editorComments.openThreadPopup(threadId, rect);
							}
							return true;
						}
					}
					const $pos = view.state.doc.resolve(pos);
					const commentMark = $pos
						.marks()
						.find((m) => m.type.name === COMMENT_MARK_NAME);
					const threadId = commentMark?.attrs.commentId as string | undefined;
					if (threadId) {
						const rect = posToDOMRect(view, pos, pos);
						if (editorComments.activeThreadId() === threadId) {
							editorComments.closeThreadPopup();
						} else {
							editorComments.openThreadPopup(threadId, rect);
						}
						return true;
					}
					return false;
				},
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
			<section
				{...rest}
				ref={editorRef}
				class={editor}
				classList={{
					"markdown-body": true,
					[local.class ?? ""]: Boolean(local.class),
				}}
				style={
					yjs.loaded() ? undefined : { opacity: 0.5, "pointer-events": "none" }
				}
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
				entity={props.pageId ? { type: "page", id: props.pageId } : undefined}
			/>

			<CommentPopup
				open={() => Boolean(editorComments.activeThreadId())}
				anchorRect={editorComments.popupRect}
				thread={editorComments.activeThread}
				reactions={pageComments.reactions()}
				currentUserId={pageComments.currentUserId()}
				authorNames={pageComments.authorNames()}
				myRole={myRole()}
				onAddComment={async (text) => {
					const id = editorComments.activeThreadId();
					if (!id) return;
					await pageComments.addComment(id, text);
					const pending = editorComments.pendingComment();
					const thread = pageComments.threads().find((t) => t.id === id);
					if (
						pending &&
						pending.threadId === id &&
						thread?.comments.length === 1
					) {
						instance
							?.chain()
							.setTextSelection({ from: pending.from, to: pending.to })
							.setComment(id)
							.run();
						editorComments.setPendingComment(null);
					}
				}}
				onToggleReaction={(commentId, reaction) => {
					void pageComments.toggleReaction(commentId, reaction);
				}}
				onDeleteComment={(commentId) => {
					const id = editorComments.activeThreadId();
					if (id) void pageComments.deleteComment(id, commentId);
				}}
				onClose={editorComments.closeThreadPopup}
			/>
		</>
	);
};

export default MarkdownEditor;
