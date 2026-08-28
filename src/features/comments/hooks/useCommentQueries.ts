import { createMutation, createQuery } from "@tanstack/solid-query";
import type { Tables } from "#/types/database";
import { supabase } from "#/utils/supabase";

export type CommentThreadRow = Tables<"comment_threads">;
export type CommentRow = Tables<"comments">;

export interface CommentThreadWithComments {
	id: string;
	pageId: string;
	cardId: string | null;
	createdAt: string;
	comments: {
		id: string;
		threadId: string;
		authorId: string;
		content: string;
		createdAt: string;
		updatedAt: string;
	}[];
}

const toThread = (
	thread: CommentThreadRow,
	comments: CommentRow[],
): CommentThreadWithComments => ({
	id: thread.id,
	pageId: thread.page_id,
	cardId: thread.card_id,
	createdAt: thread.created_at,
	comments: comments
		.filter((c) => c.thread_id === thread.id)
		.map((c) => ({
			id: c.id,
			threadId: c.thread_id,
			authorId: c.author_id,
			content: c.content,
			createdAt: c.created_at,
			updatedAt: c.updated_at,
		})),
});

export function useCommentQueries(pageId: string | undefined) {
	const threadsQuery = createQuery(() => ({
		queryKey: ["comment_threads", pageId],
		queryFn: async () => {
			const { data: threads, error: threadsError } = await supabase
				.from("comment_threads")
				.select("*")
				.eq("page_id", pageId!)
				.order("created_at", { ascending: true });
			if (threadsError) throw threadsError;

			const threadIds = threads.map((t) => t.id);
			if (threadIds.length === 0) return [];

			const { data: comments, error: commentsError } = await supabase
				.from("comments")
				.select("*")
				.in("thread_id", threadIds)
				.order("created_at", { ascending: true });
			if (commentsError) throw commentsError;

			return threads.map((t) => toThread(t, comments ?? []));
		},
		enabled: !!pageId,
	}));

	const createThread = createMutation(() => ({
		mutationFn: async (input: { pageId: string; cardId?: string }) => {
			const { data, error } = await supabase
				.from("comment_threads")
				.insert({
					page_id: input.pageId,
					card_id: input.cardId ?? null,
				})
				.select()
				.single();
			if (error) throw error;
			return { ...toThread(data, []), comments: [] };
		},
	}));

	const addComment = createMutation(() => ({
		mutationFn: async (input: {
			threadId: string;
			authorId: string;
			content: string;
		}) => {
			const { data, error } = await supabase
				.from("comments")
				.insert({
					thread_id: input.threadId,
					author_id: input.authorId,
					content: input.content,
				})
				.select()
				.single();
			if (error) throw error;
			return {
				id: data.id,
				threadId: data.thread_id,
				authorId: data.author_id,
				content: data.content,
				createdAt: data.created_at,
				updatedAt: data.updated_at,
			};
		},
	}));

	const updateComment = createMutation(() => ({
		mutationFn: async (input: { id: string; content: string }) => {
			const { error } = await supabase
				.from("comments")
				.update({ content: input.content })
				.eq("id", input.id);
			if (error) throw error;
		},
	}));

	const deleteComment = createMutation(() => ({
		mutationFn: async (id: string) => {
			const { error } = await supabase.from("comments").delete().eq("id", id);
			if (error) throw error;
		},
	}));

	const deleteThread = createMutation(() => ({
		mutationFn: async (id: string) => {
			const { error } = await supabase
				.from("comment_threads")
				.delete()
				.eq("id", id);
			if (error) throw error;
		},
	}));

	return {
		threads: threadsQuery,
		createThread,
		addComment,
		updateComment,
		deleteComment,
		deleteThread,
	};
}
