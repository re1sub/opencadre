import { createEffect, createSignal, onCleanup } from "solid-js";
import { reportDecryptionError } from "#/features/crypto/decryptionErrors";
import { VaultDecryptionError } from "#/features/crypto/errors";
import { useVault } from "#/features/crypto/VaultProvider";
import { commentAad, notificationAad } from "#/features/crypto/vault";
import { useProfile } from "#/features/workspace/hooks/useProfile";
import type { Tables } from "#/types/database";
import { nowIso } from "#/utils/date";
import { logActivity } from "#/utils/log";
import { uid } from "#/utils/misc";
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

const MENTION_PATTERN = /mention:([0-9a-fA-F-]{36})/g;
const EXCERPT_LENGTH = 300;

const extractMentionIds = (markdown: string): string[] => {
	const ids: string[] = [];
	for (const match of markdown.matchAll(MENTION_PATTERN)) ids.push(match[1]);
	return ids;
};

export function useCommentsAdapter(entity: () => CommentEntity | null) {
	const vault = useVault();
	const { name: ownName } = useProfile();

	const [threads, setThreads] = createSignal<CommentThread[]>([]);
	const [reactions, setReactions] = createSignal<CommentReaction[]>([]);
	const [authorNames, setAuthorNames] = createSignal<Record<string, string>>(
		{},
	);
	const [currentUserId, setCurrentUserId] = createSignal<string | null>(null);

	let currentWorkspaceId = "";

	const threadInserts = new Map<string, Promise<void>>();

	const knownCommentIds = () => {
		const ids = new Set<string>();
		for (const t of threads()) for (const c of t.comments) ids.add(c.id);
		return ids;
	};

	const displayName = (userId: string | null) => {
		if (!userId) return "Deleted member";
		const map = authorNames();
		return map[userId] ?? userId.slice(0, 8);
	};

	const toComment = (row: CommentRow, text: string): Comment => ({
		id: row.id,
		parentId: row.thread_id,
		author: displayName(row.author_id),
		authorId: row.author_id,
		text,
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

	const openComment = async (row: CommentRow): Promise<string> => {
		if (!currentWorkspaceId) {
			const err = new VaultDecryptionError(
				"Missing workspace for this comment.",
			);
			reportDecryptionError(`unknown:comment:${row.id}`, err);
			throw err;
		}
		return vault.openTextSafe(
			currentWorkspaceId,
			row.ciphertext,
			commentAad(row.id),
			`comment:${row.id}`,
		);
	};

	const resolveContext = async (
		e: CommentEntity,
	): Promise<{ workspaceId: string; pageId: string } | null> => {
		if (e.type === "page") {
			const { data, error } = await supabase
				.from("pages")
				.select("workspace_id")
				.eq("id", e.id)
				.single();
			if (error || !data) return null;
			return { workspaceId: data.workspace_id, pageId: e.id };
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
		return { workspaceId: pageData.workspace_id, pageId: cardData.page_id };
	};

	const loadAuthors = async (workspaceId: string) => {
		const { data, error } = await supabase
			.from("workspace_members")
			.select("user_id")
			.eq("workspace_id", workspaceId);
		if (error) return;

		const map: Record<string, string> = {};
		for (const m of data ?? []) {
			if (!m.user_id) continue;
			map[m.user_id] = m.user_id.slice(0, 8);
		}

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (user) map[user.id] = ownName() || user.id.slice(0, 8);

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

		const withText = await Promise.all(
			(commentData ?? []).map(async (row) =>
				toComment(row, await openComment(row)),
			),
		);

		setThreads(
			threadData.map((t) => ({
				...emptyThread(t),
				comments: withText.filter((c) => c.parentId === t.id),
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

	const applyRemoteComment = async (row: CommentRow) => {
		if (knownCommentIds().has(row.id)) return;
		const comment = toComment(row, await openComment(row));
		setThreads((current) =>
			current.map((t) => {
				if (t.id !== row.thread_id) return t;
				if (t.comments.some((c) => c.id === row.id)) return t;
				return { ...t, comments: [...t.comments, comment] };
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
		applyInsert: (row) => {
			void applyRemoteComment(row as unknown as CommentRow).catch(() => {});
		},
		applyUpdate: (row) => {
			const r = row as unknown as CommentRow;
			void (async () => {
				const text = await openComment(r);
				setThreads((current) =>
					current.map((t) =>
						t.id === r.thread_id
							? {
									...t,
									comments: t.comments.map((c) =>
										c.id === r.id ? { ...c, text, createdAt: r.created_at } : c,
									),
								}
							: t,
					),
				);
			})().catch(() => {});
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
		const status = vault.status();
		vault.epoch();
		if (!e?.id) return;

		if (status !== "unlocked") {
			setThreads([]);
			return;
		}

		void (async () => {
			try {
				const context = await resolveContext(e);
				if (!context) return;
				currentWorkspaceId = context.workspaceId;
				await loadAuthors(context.workspaceId);
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

		const id = uid();
		const thread: CommentThread = {
			id,
			entityType: e.type,
			entityId: e.id,
			anchorText,
			createdAt: nowIso(),
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

		const id = uid();
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
			createdAt: nowIso(),
			comments: [],
		};
		setThreads((prev) =>
			prev.some((t) => t.id === id) ? prev : [...prev, thread],
		);
		return thread;
	};

	const notifyComment = async (
		commentId: string,
		text: string,
		workspaceId: string,
	) => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return;

		try {
			const title = `${displayName(user.id)} mentioned you`;
			const body = text.trim().slice(0, EXCERPT_LENGTH);
			const [mentionTitle, commentTitle, sealedBody] = await Promise.all([
				vault.sealText(
					workspaceId,
					title,
					notificationAad(workspaceId, commentId, "title"),
				),
				vault.sealText(
					workspaceId,
					`${displayName(user.id)} commented`,
					notificationAad(workspaceId, commentId, "title"),
				),
				vault.sealText(
					workspaceId,
					body,
					notificationAad(workspaceId, commentId, "body"),
				),
			]);

			const { error } = await supabase.rpc("create_comment_notifications", {
				p_comment_id: commentId,
				p_mention_title: mentionTitle,
				p_comment_title: commentTitle,
				p_body: sealedBody,
				p_recipient_ids: [...new Set(extractMentionIds(text))],
			});
			if (error) console.error("create_comment_notifications failed", error);
		} catch (err) {
			console.error("Failed to create comment notifications", err);
		}
	};

	const addComment = async (
		threadId: string,
		text: string,
	): Promise<Comment> => {
		const e = entity();
		if (!e) throw new Error("Cannot comment without an entity");

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error("Not authenticated");

		const context = await resolveContext(e);
		if (!context) throw new Error("Could not resolve the workspace");

		const pending = threadInserts.get(threadId);
		if (pending) await pending;

		const body = text.trim();
		const id = crypto.randomUUID();
		const sealed = await vault.sealText(
			context.workspaceId,
			body,
			commentAad(id),
		);

		const { data, error } = await supabase
			.from("comments")
			.insert({
				id,
				thread_id: threadId,
				author_id: user.id,
				ciphertext: sealed,
			})
			.select("id, thread_id, author_id, created_at")
			.single();
		if (error) throw error;

		const created: Comment = {
			id: data.id,
			parentId: data.thread_id,
			author: displayName(user.id),
			authorId: user.id,
			text: body,
			createdAt: data.created_at,
		};

		setThreads((current) =>
			current.map((t) =>
				t.id === threadId && !t.comments.some((c) => c.id === created.id)
					? { ...t, comments: [...t.comments, created] }
					: t,
			),
		);

		await logActivity(context.workspaceId, e.type, e.id, "comment_add", {
			thread_id: threadId,
		});
		await notifyComment(id, body, context.workspaceId);

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

	const deleteThread = async (threadId: string) => {
		const { error } = await supabase
			.from("comment_threads")
			.delete()
			.eq("id", threadId);
		if (error) {
			console.error("Failed to delete the comment thread", error);
			return;
		}
		setThreads((current) => current.filter((t) => t.id !== threadId));
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
			const { error } = await supabase
				.from("comment_reactions")
				.delete()
				.eq("id", existing.id);
			if (error) {
				console.error("Failed to remove the reaction", error);
				return;
			}
			setReactions((prev) => prev.filter((r) => r.id !== existing.id));
			return;
		}

		const { data, error } = await supabase
			.from("comment_reactions")
			.insert({ comment_id: commentId, user_id: user, reaction })
			.select()
			.single();
		if (error) {
			console.error("Failed to add the reaction", error);
			return;
		}
		if (!data) return;
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
