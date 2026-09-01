import { createSignal } from "solid-js";
import { uid } from "#/utils/misc";
import type { Comment, CommentThread } from "../types";

interface PageCommentsStore {
	get: () => CommentThread[];
	set: (
		next: CommentThread[] | ((prev: CommentThread[]) => CommentThread[]),
	) => void;
}

const stores = new Map<string, PageCommentsStore>();

export function usePageComments(pageId: string) {
	let store = stores.get(pageId);
	if (!store) {
		const [get, set] = createSignal<CommentThread[]>([]);
		store = { get, set };
		stores.set(pageId, store);
	}

	const createThread = (anchorText: string): CommentThread => {
		const thread: CommentThread = {
			id: uid(),
			pageId,
			anchorText,
			createdAt: new Date().toISOString(),
			comments: [],
		};
		store!.set((current) => [...current, thread]);
		return thread;
	};

	const addComment = (
		threadId: string,
		comment: Omit<Comment, "id" | "parentId" | "createdAt">,
	): Comment => {
		const created: Comment = {
			id: uid(),
			parentId: threadId,
			createdAt: new Date().toISOString(),
			...comment,
		};
		store!.set((current) =>
			current.map((t) =>
				t.id === threadId ? { ...t, comments: [...t.comments, created] } : t,
			),
		);
		return created;
	};

	const deleteComment = (threadId: string, commentId: string) => {
		store!.set((current) =>
			current.map((t) =>
				t.id === threadId
					? { ...t, comments: t.comments.filter((c) => c.id !== commentId) }
					: t,
			),
		);
	};

	const deleteThread = (threadId: string) => {
		store!.set((current) => current.filter((t) => t.id !== threadId));
	};

	const replaceThreadComments = (threadId: string, comments: Comment[]) => {
		store!.set((current) =>
			current.map((t) => (t.id === threadId ? { ...t, comments } : t)),
		);
	};

	return {
		threads: store.get,
		createThread,
		addComment,
		deleteComment,
		deleteThread,
		replaceThreadComments,
	};
}
