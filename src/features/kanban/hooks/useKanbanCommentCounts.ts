import { createEffect, createSignal, onCleanup } from "solid-js";
import type { Tables } from "#/types/database";
import { registerRealtimeHandlers } from "#/utils/realtime/registrar";
import { supabase } from "#/utils/supabase";

type ThreadRow = Tables<"comment_threads">;
type CommentRow = Tables<"comments">;

export function useKanbanCommentCounts(cardIds: () => string[]) {
	const [counts, setCounts] = createSignal<Record<string, number>>({});
	const threadToCard = new Map<string, string>();

	const load = async (ids: string[]) => {
		if (ids.length === 0) {
			threadToCard.clear();
			setCounts({});
			return;
		}

		const { data: threads, error: tErr } = await supabase
			.from("comment_threads")
			.select("id, entity_id")
			.eq("entity_type", "card")
			.in("entity_id", ids);

		if (tErr) {
			console.error("Failed to load comment threads for counts", tErr);
			return;
		}

		threadToCard.clear();
		for (const t of (threads ?? []) as Pick<ThreadRow, "id" | "entity_id">[]) {
			threadToCard.set(t.id, t.entity_id);
		}

		const threadIds = [...threadToCard.keys()];
		if (threadIds.length === 0) {
			const empty: Record<string, number> = {};
			for (const id of ids) empty[id] = 0;
			setCounts(empty);
			return;
		}

		const { data: comments, error: cErr } = await supabase
			.from("comments")
			.select("id, thread_id")
			.in("thread_id", threadIds);

		if (cErr) {
			console.error("Failed to load comments for counts", cErr);
			return;
		}

		const byCard: Record<string, number> = {};
		for (const id of ids) byCard[id] = 0;
		for (const c of (comments ?? []) as Pick<CommentRow, "thread_id">[]) {
			const cardId = threadToCard.get(c.thread_id);
			if (cardId) byCard[cardId] = (byCard[cardId] ?? 0) + 1;
		}
		setCounts(byCard);
	};

	// Reload when the set of card ids changes (compare as sorted JSON)
	let prevKey = "";
	createEffect(() => {
		const ids = [...new Set(cardIds().filter(Boolean))];
		const key = JSON.stringify([...ids].sort());
		if (key === prevKey) return;
		prevKey = key;
		void load(ids);
	});

	const unregisterThreads = registerRealtimeHandlers("comment_threads", {
		applyInsert: (row) => {
			const r = row as unknown as ThreadRow;
			if (r.entity_type !== "card") return;
			if (!cardIds().includes(r.entity_id)) return;
			if (threadToCard.has(r.id)) return;
			threadToCard.set(r.id, r.entity_id);
			setCounts((prev) => ({ ...prev, [r.entity_id]: prev[r.entity_id] ?? 0 }));
		},
		applyUpdate: () => {},
		applyDelete: (row) => {
			const r = row as unknown as ThreadRow;
			const cardId = threadToCard.get(r.id);
			if (!cardId) return;
			threadToCard.delete(r.id);
			// counts will be corrected on next comment deletes; zero it if no thread left for that card
			const stillHasThread = [...threadToCard.values()].includes(cardId);
			if (!stillHasThread) {
				setCounts((prev) => ({ ...prev, [cardId]: 0 }));
			}
		},
	});

	const unregisterComments = registerRealtimeHandlers("comments", {
		applyInsert: (row) => {
			const r = row as unknown as CommentRow;
			const cardId = threadToCard.get(r.thread_id);
			if (!cardId) return;
			setCounts((prev) => ({ ...prev, [cardId]: (prev[cardId] ?? 0) + 1 }));
		},
		applyUpdate: () => {},
		applyDelete: (row) => {
			const r = row as unknown as CommentRow;
			const cardId = threadToCard.get(r.thread_id);
			if (!cardId) return;
			setCounts((prev) => ({
				...prev,
				[cardId]: Math.max(0, (prev[cardId] ?? 1) - 1),
			}));
		},
	});

	onCleanup(() => {
		unregisterThreads();
		unregisterComments();
	});

	return counts;
}
