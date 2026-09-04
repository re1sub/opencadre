import { createEffect, createSignal, onCleanup } from "solid-js";
import type { Tables } from "#/types/database";
import { registerRealtimeHandlers } from "#/utils/realtime/registrar";
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

	const liveTempIds = new Set<string>();

	const emptyThread = (row: CommentThreadRow): CommentThread => ({
		id: row.id,
		pageId: row.page_id,
		anchorText: "",
		createdAt: row.created_at,
		comments: [],
	});

	const applyRemoteComment = (row: CommentRow) => {
		setThreads((current) =>
			current.map((t) => {
				if (t.id !== row.thread_id) return t;
				if (t.comments.some((c) => c.id === row.id)) return t;
				return {
					...t,
					comments: [
						...t.comments,
						{
							id: row.id,
							parentId: row.thread_id,
							author: row.author_id,
							text: row.content,
							createdAt: row.created_at,
						},
					],
				};
			}),
		);
	};

	const unregisterThreads = registerRealtimeHandlers("comment_threads", {
		applyInsert: (row) => {
			const r = row as unknown as CommentThreadRow;
			if (r.page_id !== pageId()) return;

			setThreads((current) => {
				if (current.some((t) => t.id === r.id)) return current;

				// Oldest still-present live temp (Set iteration order = creation order)
				let targetId: string | undefined;
				for (const tid of liveTempIds) {
					if (current.some((t) => t.id === tid)) {
						targetId = tid;
						break;
					}
				}
				if (targetId) {
					liveTempIds.delete(targetId);
					return current.map((t) => (t.id === targetId ? emptyThread(r) : t));
				}

				return [...current, emptyThread(r)];
			});
		},
		applyUpdate: () => {},
		applyDelete: (row) => {
			setThreads((current) => current.filter((t) => t.id !== row.id));
		},
	});

	const unregisterComments = registerRealtimeHandlers("comments", {
		applyInsert: (row) => applyRemoteComment(row as unknown as CommentRow),
		applyUpdate: (row) => {
			const r = row as unknown as CommentRow;
			setThreads((current) =>
				current.map((t) =>
					t.id === r.thread_id
						? {
								...t,
								comments: t.comments.map((c) =>
									c.id === r.id
										? { ...c, text: r.content, createdAt: r.created_at }
										: c,
								),
							}
						: t,
				),
			);
		},
		applyDelete: (row) => {
			const r = row as unknown as CommentRow;
			setThreads((current) =>
				current.map((t) =>
					t.id === r.thread_id
						? { ...t, comments: t.comments.filter((c) => c.id !== r.id) }
						: t,
				),
			);
		},
	});

	onCleanup(() => {
		unregisterThreads();
		unregisterComments();
	});

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
		liveTempIds.add(tempId);

		// Fire-and-forget: persist to DB, replace temp ID on success
		(async () => {
			const { data, error } = await supabase
				.from("comment_threads")
				.insert({ page_id: pageId() })
				.select()
				.single();
			if (error || !data) {
				liveTempIds.delete(tempId);
				return;
			}

			setThreads((prev) =>
				prev.map((t) =>
					t.id === tempId
						? { ...t, id: data.id, createdAt: data.created_at }
						: t,
				),
			);
			liveTempIds.delete(tempId);
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
