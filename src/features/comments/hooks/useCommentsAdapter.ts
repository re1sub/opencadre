import { createEffect, createSignal, onCleanup } from "solid-js";
import type { Tables } from "#/types/database";
import { logActivity } from "#/utils/log";
import { registerRealtimeHandlers } from "#/utils/realtime/registrar";
import { supabase } from "#/utils/supabase";
import type {
	Comment,
	CommentEntity,
	CommentReaction,
	CommentThread,
} from "../types";

type CommentThreadRow = Tables<"comment_threads">;
type CommentRow = Tables<"comments">;
type CommentReactionRow = Tables<"comment_reactions">;

/**
 * Reactive comments store for a single entity (a page or a card). Owns thread,
 * comment and reaction state, persists writes through Supabase and syncs
 * inserts/updates/deletes via the realtime registrar.
 *
 * Thread ids are generated client-side and persisted explicitly, so a thread's
 * id is stable from creation and comments can safely reference it once the
 * thread row exists (FK ordering is handled via `threadInserts`).
 */
export function useCommentsAdapter(entity: () => CommentEntity | null) {
	const [threads, setThreads] = createSignal<CommentThread[]>([]);
	const [reactions, setReactions] = createSignal<CommentReaction[]>([]);
	const [authorNames, setAuthorNames] = createSignal<Record<string, string>>(
		{},
	);
	const [currentUserId, setCurrentUserId] = createSignal<string | null>(null);

	// threadId -> promise that resolves once the thread row has been inserted.
	const threadInserts = new Map<string, Promise<void>>();

	const knownCommentIds = () => {
		const ids = new Set<string>();
		for (const t of threads()) for (const c of t.comments) ids.add(c.id);
		return ids;
	};

	const displayName = (userId: string) => {
		const map = authorNames();
		return map[userId] ?? userId.slice(0, 8);
	};

	const toComment = (row: CommentRow): Comment => ({
		id: row.id,
		parentId: row.thread_id,
		author: displayName(row.author_id),
		authorId: row.author_id,
		text: row.content,
		createdAt: row.created_at,
	});

	const toReaction = (row: CommentReactionRow): CommentReaction => ({
		id: row.id,
		commentId: row.comment_id,
		userId: row.user_id,
		reaction: row.reaction,
		createdAt: row.created_at,
	});

	const emptyThread = (row: CommentThreadRow): CommentThread => ({
		id: row.id,
		entityType: row.entity_type as CommentEntity["type"],
		entityId: row.entity_id,
		anchorText: "",
		createdAt: row.created_at,
		comments: [],
	});

	const resolveWorkspace = async (e: CommentEntity) => {
		if (e.type === "page") {
			const { data, error } = await supabase
				.from("pages")
				.select("workspace_id")
				.eq("id", e.id)
				.single();
			if (error || !data) return null;
			return data.workspace_id;
		}
		const { data: cardData, error: cardError } = await supabase
			.from("cards")
			.select("page_id")
			.eq("id", e.id)
			.single();
		if (cardError || !cardData?.page_id) return null;
		const { data: pageData, error: pageError } = await supabase
			.from("pages")
			.select("workspace_id")
			.eq("id", cardData.page_id)
			.single();
		if (pageError || !pageData) return null;
		return pageData.workspace_id;
	};

	const loadAuthors = async (workspaceId: string) => {
		const { data, error } = await supabase
			.from("workspace_members")
			.select("user_id, profiles(display_name)")
			.eq("workspace_id", workspaceId);
		if (error) return;

		const map: Record<string, string> = {};
		for (const m of data ?? []) {
			if (!m.user_id) continue;
			const name = m.profiles?.display_name?.trim();
			map[m.user_id] = name || m.user_id.slice(0, 8);
		}

		const {
			data: { user },
		} = await supabase.auth.getUser();
		const displayNameFlag = user?.user_metadata?.display_name;
		if (user && typeof displayNameFlag === "string" && displayNameFlag.trim()) {
			map[user.id] = displayNameFlag.trim();
		}

		setAuthorNames(map);
	};

	const fetchThreads = async (e: CommentEntity) => {
		const { data: threadData, error: threadError } = await supabase
			.from("comment_threads")
			.select("*")
			.eq("entity_type", e.type)
			.eq("entity_id", e.id)
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

		setThreads(
			threadData.map((t) => ({
				...emptyThread(t),
				comments: (commentData ?? [])
					.filter((c) => c.thread_id === t.id)
					.map(toComment),
			})),
		);
	};

	const fetchReactions = async () => {
		const ids = [...knownCommentIds()];
		if (ids.length === 0) {
			setReactions([]);
			return;
		}
		const { data, error } = await supabase
			.from("comment_reactions")
			.select("*")
			.in("comment_id", ids);
		if (error) throw error;
		setReactions((data ?? []).map(toReaction));
	};

	const applyRemoteComment = (row: CommentRow) => {
		setThreads((current) =>
			current.map((t) => {
				if (t.id !== row.thread_id) return t;
				if (t.comments.some((c) => c.id === row.id)) return t;
				return { ...t, comments: [...t.comments, toComment(row)] };
			}),
		);
	};

	const unregisterThreads = registerRealtimeHandlers("comment_threads", {
		applyInsert: (row) => {
			const r = row as unknown as CommentThreadRow;
			const e = entity();
			if (!e || r.entity_type !== e.type || r.entity_id !== e.id) return;

			setThreads((current) => {
				if (current.some((t) => t.id === r.id)) return current;
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
			setReactions((prev) =>
				prev.filter((reaction) => reaction.commentId !== r.id),
			);
		},
	});

	const unregisterReactions = registerRealtimeHandlers("comment_reactions", {
		applyInsert: (row) => {
			const r = row as unknown as CommentReactionRow;
			if (!knownCommentIds().has(r.comment_id)) return;
			setReactions((prev) =>
				prev.some((x) => x.id === r.id) ? prev : [...prev, toReaction(r)],
			);
		},
		applyUpdate: () => {},
		applyDelete: (row) => {
			const r = row as unknown as CommentReactionRow;
			setReactions((prev) => prev.filter((x) => x.id !== r.id));
		},
	});

	onCleanup(() => {
		unregisterThreads();
		unregisterComments();
		unregisterReactions();
	});

	createEffect(() => {
		const e = entity();
		if (!e?.id) return;
		(async () => {
			try {
				const workspaceId = await resolveWorkspace(e);
				if (workspaceId) await loadAuthors(workspaceId);
				await fetchThreads(e);
				await fetchReactions();
			} catch (err) {
				console.error("Failed to load comments", err);
			}
		})();
	});

	createEffect(() => {
		supabase.auth
			.getUser()
			.then(({ data }) => setCurrentUserId(data.user?.id ?? null));
	});

	const persistThread = (
		id: string,
		entityType: CommentEntity["type"],
		entityId: string,
	) => {
		const promise = (async () => {
			const { error } = await supabase.from("comment_threads").insert({
				id,
				entity_type: entityType,
				entity_id: entityId,
			});
			if (error) {
				setThreads((prev) => prev.filter((t) => t.id !== id));
			}
		})();
		threadInserts.set(id, promise);
		return promise;
	};

	const createThread = (anchorText: string): CommentThread => {
		const e = entity();
		if (!e) throw new Error("Cannot create thread without an entity");

		const id = crypto.randomUUID();
		const thread: CommentThread = {
			id,
			entityType: e.type,
			entityId: e.id,
			anchorText,
			createdAt: new Date().toISOString(),
			comments: [],
		};

		setThreads((prev) => [...prev, thread]);
		persistThread(id, e.type, e.id);

		return thread;
	};

	const ensureThread = async (): Promise<CommentThread> => {
		const e = entity();
		if (!e) throw new Error("Cannot create thread without an entity");

		const existing = threads().find(
			(t) => t.entityType === e.type && t.entityId === e.id,
		);
		if (existing) return existing;

		const id = crypto.randomUUID();
		const { error } = await supabase.from("comment_threads").insert({
			id,
			entity_type: e.type,
			entity_id: e.id,
		});
		if (error) throw error;

		const thread: CommentThread = {
			id,
			entityType: e.type,
			entityId: e.id,
			anchorText: "",
			createdAt: new Date().toISOString(),
			comments: [],
		};
		setThreads((prev) =>
			prev.some((t) => t.id === id) ? prev : [...prev, thread],
		);
		return thread;
	};

	const addComment = async (
		threadId: string,
		text: string,
	): Promise<Comment> => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error("Not authenticated");

		// The thread row must exist before the comment can reference it.
		const pending = threadInserts.get(threadId);
		if (pending) await pending;

		const { data, error } = await supabase
			.from("comments")
			.insert({
				thread_id: threadId,
				author_id: user.id,
				content: text.trim(),
			})
			.select()
			.single();
		if (error) throw error;

		const created: Comment = {
			id: data.id,
			parentId: data.thread_id,
			author: displayName(user.id),
			authorId: user.id,
			text: data.content,
			createdAt: data.created_at,
		};

		setThreads((current) =>
			current.map((t) =>
				t.id === threadId && !t.comments.some((c) => c.id === created.id)
					? { ...t, comments: [...t.comments, created] }
					: t,
			),
		);

		const e = entity();
		if (e) {
			const workspaceId = await resolveWorkspace(e);
			if (workspaceId) {
				await logActivity(workspaceId, e.type, e.id, "comment_add", {
					thread_id: threadId,
				});
			}
		}

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
		supabase.from("comment_threads").delete().eq("id", threadId);
	};

	const toggleReaction = async (commentId: string, reaction: string) => {
		const user = currentUserId();
		if (!user) return;

		const existing = reactions().find(
			(r) =>
				r.commentId === commentId &&
				r.userId === user &&
				r.reaction === reaction,
		);

		if (existing) {
			setReactions((prev) => prev.filter((r) => r.id !== existing.id));
			await supabase.from("comment_reactions").delete().eq("id", existing.id);
			return;
		}

		const { data, error } = await supabase
			.from("comment_reactions")
			.insert({ comment_id: commentId, user_id: user, reaction })
			.select()
			.single();
		if (error || !data) return;
		setReactions((prev) => {
			if (prev.some((r) => r.id === data.id)) return prev;
			return [...prev, toReaction(data)];
		});
	};

	return {
		threads,
		reactions,
		currentUserId,
		authorNames,
		createThread,
		ensureThread,
		addComment,
		deleteComment,
		deleteThread,
		toggleReaction,
	};
}
