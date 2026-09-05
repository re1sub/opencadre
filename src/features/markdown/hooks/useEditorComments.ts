import { type Editor, posToDOMRect } from "@tiptap/core";
import { createSignal } from "solid-js";
import type { useCommentsAdapter } from "#/features/comments/hooks/useCommentsAdapter";
import { COMMENT_MARK_NAME } from "#/features/comments/mark/CommentMark";

type CommentsReturn = ReturnType<typeof useCommentsAdapter>;

export function useEditorComments(pageComments: CommentsReturn) {
	const [activeThreadId, setActiveThreadId] = createSignal<string | null>(null);
	const [popupRect, setPopupRect] = createSignal<DOMRect | null>(null);
	const [pendingComment, setPendingComment] = createSignal<{
		threadId: string;
		from: number;
		to: number;
	} | null>(null);

	const activeThread = () =>
		pageComments.threads().find((t) => t.id === activeThreadId());

	const openThreadPopup = (threadId: string, rect: DOMRect) => {
		setActiveThreadId(threadId);
		setPopupRect(rect);
	};

	const discardPending = () => {
		const pending = pendingComment();
		if (!pending) return;
		const thread = pageComments
			.threads()
			.find((t) => t.id === pending.threadId);
		if (thread && thread.comments.length === 0) {
			pageComments.deleteThread(pending.threadId);
		}
		setPendingComment(null);
	};

	const closeThreadPopup = () => {
		discardPending();
		setActiveThreadId(null);
		setPopupRect(null);
	};

	const pruneOrphanThreads = (editorInstance: Editor) => {
		const ids = new Set<string>();
		editorInstance.state.doc.descendants((node) => {
			node.marks.forEach((mark) => {
				if (mark.type.name === COMMENT_MARK_NAME && mark.attrs.commentId) {
					ids.add(mark.attrs.commentId as string);
				}
			});
		});
		const valid = [...ids];
		const pending = pendingComment();
		const orphans = pageComments
			.threads()
			.filter(
				(t) =>
					!valid.includes(t.id) &&
					t.comments.length === 0 &&
					t.id !== pending?.threadId,
			);

		orphans.forEach((t) => {
			pageComments.deleteThread(t.id);
		});
	};

	const handleCommentAction = (
		instance: Editor,
		hideBubbleMenus: () => void,
	) => {
		let { from, to, empty } = instance.state.selection;
		if (empty) {
			const $pos = instance.state.selection.$from;
			const text = $pos.parent.textContent;
			const offset = $pos.parentOffset;
			let start = offset;
			let end = offset;
			while (start > 0 && /\w/.test(text[start - 1])) start--;
			while (end < text.length && /\w/.test(text[end])) end++;
			if (start === end) return;
			from = $pos.start() + start;
			to = $pos.start() + end;
		}
		const rect = posToDOMRect(instance.view, from, to);

		const existingIds = new Set<string>();
		instance.state.doc.nodesBetween(from, to, (node) => {
			node.marks.forEach((mark) => {
				if (mark.type.name === COMMENT_MARK_NAME && mark.attrs.commentId) {
					existingIds.add(mark.attrs.commentId as string);
				}
			});
		});

		const firstId = [...existingIds][0];
		if (firstId) {
			discardPending();
			if (activeThreadId() === firstId) {
				closeThreadPopup();
			} else {
				openThreadPopup(firstId, rect);
			}
			hideBubbleMenus();
			return;
		}

		const text = instance.state.doc.textBetween(from, to, " ");
		const thread = pageComments.createThread(text.trim() || "…");
		setPendingComment({ threadId: thread.id, from, to });
		openThreadPopup(thread.id, rect);
		hideBubbleMenus();
	};

	return {
		activeThreadId,
		popupRect,
		pendingComment,
		setPendingComment,
		activeThread,
		openThreadPopup,
		closeThreadPopup,
		pruneOrphanThreads,
		handleCommentAction,
	};
}
