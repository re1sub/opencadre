import { createEffect, createSignal } from "solid-js";
import type { Tables } from "#/types/database";
import { supabase } from "#/utils/supabase";
import type { Comment, CommentThread } from "../types";

type CommentThreadRow = Tables<"comment_threads">;
type CommentRow = Tables<"comments">;

const toThread = (
	thread: CommentThreadRow,
	comments: CommentRow[],
): CommentThread => ({
	id: thread.id,
	pageId: thread.page_id,
	anchorText: "",
	createdAt: thread.created_at,
	comments: comments
		.filter((c) => c.thread_id === thread.id)
		.map((c) => ({
			id: c.id,
			parentId: c.thread_id,
			author: c.author_id,
			text: c.content,
			createdAt: c.created_at,
		})),
});

export function usePageCommentsAdapter(pageId: () => string) {
	const [threads, setThreads] = createSignal<CommentThread[]>([]);

	const fetchThreads = async (pid: string) => {
		const { data: threadData, error: threadError } = await supabase
			.from("comment_threads")
			.select("*")
			.eq("page_id", pid)
			.order("created_at", { ascending: true });
		if (threadError) throw threadError;

		if (!threadData || threadData.length === 0) {
			setThreads([]);
			return;
		}

		const threadIds = threadData.map((t) => t.id);
		const { data: commentData, error: commentError } = await supabase
			.from("comments")
			.select("*")
			.in("thread_id", threadIds)
			.order("created_at", { ascending: true });
		if (commentError) throw commentError;

		setThreads(threadData.map((t) => toThread(t, commentData ?? [])));
	};

	createEffect(() => {
		const pid = pageId();
		if (pid) fetchThreads(pid);
	});

	const createThread = (anchorText: string): CommentThread => {
		const tempId = crypto.randomUUID();

		const thread: CommentThread = {
			id: tempId,
			pageId: pageId(),
			anchorText,
			createdAt: new Date().toISOString(),
			comments: [],
		};

		setThreads((prev) => [...prev, thread]);

		// Fire-and-forget: persist to DB, replace temp ID on success
		(async () => {
			const { data, error } = await supabase
				.from("comment_threads")
				.insert({ page_id: pageId() })
				.select()
				.single();
			if (error || !data) return;

			setThreads((prev) =>
				prev.map((t) =>
					t.id === tempId
						? { ...t, id: data.id, createdAt: data.created_at }
						: t,
				),
			);
		})();

		return thread;
	};

	const addComment = async (
		threadId: string,
		comment: Omit<Comment, "id" | "parentId" | "createdAt">,
	): Promise<Comment> => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error("Not authenticated");

		const { data, error } = await supabase
			.from("comments")
			.insert({
				thread_id: threadId,
				author_id: user.id,
				content: comment.text,
			})
			.select()
			.single();
		if (error) throw error;

		const created: Comment = {
			id: data.id,
			parentId: data.thread_id,
			author: comment.author,
			text: data.content,
			createdAt: data.created_at,
		};

		setThreads((current) =>
			current.map((t) =>
				t.id === threadId ? { ...t, comments: [...t.comments, created] } : t,
			),
		);
		return created;
	};

	const deleteComment = async (threadId: string, commentId: string) => {
		const { error } = await supabase
			.from("comments")
			.delete()
			.eq("id", commentId);
		if (error) throw error;

		setThreads((current) =>
			current.map((t) =>
				t.id === threadId
					? { ...t, comments: t.comments.filter((c) => c.id !== commentId) }
					: t,
			),
		);
	};

	const deleteThread = (threadId: string) => {
		setThreads((current) => current.filter((t) => t.id !== threadId));

		// Fire-and-forget DB deletion
		supabase.from("comment_threads").delete().eq("id", threadId);
	};

	const replaceThreadComments = (threadId: string, comments: Comment[]) => {
		setThreads((current) =>
			current.map((t) => (t.id === threadId ? { ...t, comments } : t)),
		);
	};

	return {
		threads,
		createThread,
		addComment,
		deleteComment,
		deleteThread,
		replaceThreadComments,
	};
}
