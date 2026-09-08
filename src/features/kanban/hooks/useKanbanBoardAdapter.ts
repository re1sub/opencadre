import { move } from "@dnd-kit/helpers";
import type { DragDropProviderProps } from "@dnd-kit/solid";
import { isSortable } from "@dnd-kit/solid/sortable";
import { createEffect, createSignal, onCleanup } from "solid-js";
import * as Y from "yjs";
import type { Database, Tables } from "#/types/database";
import { indexBy } from "#/utils/array";
import { nowIso, toIsoDate } from "#/utils/date";
import { logActivity } from "#/utils/log";
import { uid } from "#/utils/misc";
import { supabase } from "#/utils/supabase";
import { useDragReorder } from "#/utils/useDragReorder";
import {
	asNullableString,
	asString,
	asStringArray,
	type YjsUpdateOrigin,
} from "#/utils/yjs/types";
import { useYjsDoc } from "#/utils/yjs/useYjsDoc";
import { cardDraftSchema } from "../schemas";
import type {
	Card,
	CardDialogState,
	Column,
	ColumnDialogState,
	ConfirmDialogState,
} from "../types";
import { BOARD_ID } from "../types";
import { initKanbanDoc, mutateKanbanDoc, parseKanbanDoc } from "./kanbanYjs";

type ColumnRow = Tables<"columns">;
type CardRow = Tables<"cards">;

type CardsInsert = Database["public"]["Tables"]["cards"]["Insert"] & {
	id: string;
};
type CardTagsInsert = Database["public"]["Tables"]["card_tags"]["Insert"];

const toColumn = (row: ColumnRow): Column => ({
	id: row.id,
	title: row.title,
	color: row.color ?? "",
	cards: [],
	position: row.position ?? 0,
});

const toCard = (row: CardRow, tagIds?: string[]): Card => ({
	id: row.id,
	title: row.title,
	description: row.description ?? "",
	dueDate: row.due_date ? toIsoDate(new Date(row.due_date)) : null,
	assigneeIds: row.assignee_ids ?? [],
	tagIds: tagIds ?? [],
	position: row.position ?? 0,
});

interface UseKanbanBoardAdapterOptions {
	pageId: string;
	workspaceId?: string;
	onChange?: (columns: Column[]) => void;
}

export function useKanbanBoardAdapter(options: UseKanbanBoardAdapterOptions) {
	const [columns, setColumns] = createSignal<Column[]>([]);
	const [cardDialog, setCardDialog] = createSignal<CardDialogState | null>(
		null,
	);
	const [columnDialog, setColumnDialog] =
		createSignal<ColumnDialogState | null>(null);
	const [confirmDialog, setConfirmDialog] =
		createSignal<ConfirmDialogState | null>(null);

	const yjs = useYjsDoc({
		entityType: () => "kanban",
		entityId: () => options.pageId,
		workspaceId: () => options.workspaceId ?? "",
	});

	let syncTimeout: number | undefined;
	let lastPersistedColIds: Set<string> | null = null;
	let lastPersistedCardIds: Set<string> | null = null;

	const persistToSupabase = async (currentCols: Column[]) => {
		if (!options.pageId) return;

		const colRows = currentCols.map((c) => ({
			id: c.id,
			page_id: options.pageId,
			title: c.title,
			color: c.color || null,
			position: c.position,
		}));
		if (colRows.length > 0) await supabase.from("columns").upsert(colRows);

		const currentColIds = new Set(currentCols.map((c) => c.id));
		if (lastPersistedColIds !== null) {
			const colIdsToDelete = [...lastPersistedColIds].filter(
				(id) => !currentColIds.has(id),
			);
			if (colIdsToDelete.length > 0)
				await supabase.from("columns").delete().in("id", colIdsToDelete);
		} else {
			const { data: existingCols } = await supabase
				.from("columns")
				.select("id")
				.eq("page_id", options.pageId);
			const colsToDelete = (existingCols || []).filter(
				(c) => !currentColIds.has(c.id),
			);
			if (colsToDelete.length > 0)
				await supabase
					.from("columns")
					.delete()
					.in(
						"id",
						colsToDelete.map((c) => c.id),
					);
		}

		const cardRows: CardsInsert[] = [];
		const tagRows: CardTagsInsert[] = [];
		currentCols.forEach((col) => {
			col.cards.forEach((card) => {
				cardRows.push({
					id: card.id,
					column_id: col.id,
					page_id: options.pageId,
					title: card.title,
					description: card.description || null,
					due_date: card.dueDate || null,
					assignee_ids: card.assigneeIds || [],
					position: card.position,
				});
				if (card.tagIds) {
					card.tagIds.forEach((tagId) => {
						tagRows.push({ card_id: card.id, tag_id: tagId });
					});
				}
			});
		});

		if (cardRows.length > 0) await supabase.from("cards").upsert(cardRows);

		const currentCardIds = new Set(cardRows.map((c) => c.id));
		if (lastPersistedCardIds !== null) {
			const cardIdsToDelete = [...lastPersistedCardIds].filter(
				(id) => !currentCardIds.has(id),
			);
			if (cardIdsToDelete.length > 0)
				await supabase.from("cards").delete().in("id", cardIdsToDelete);
		} else {
			const { data: existingCards } = await supabase
				.from("cards")
				.select("id")
				.eq("page_id", options.pageId);
			const cardsToDelete = (existingCards || []).filter(
				(c) => !currentCardIds.has(c.id),
			);
			if (cardsToDelete.length > 0)
				await supabase
					.from("cards")
					.delete()
					.in(
						"id",
						cardsToDelete.map((c) => c.id),
					);
		}

		const allCardIds = cardRows.map((c) => c.id);
		if (allCardIds.length > 0) {
			const { data: existingTags } = await supabase
				.from("card_tags")
				.select("id, card_id, tag_id")
				.in("card_id", allCardIds);
			const existingSet = new Set(
				(existingTags || []).map((t) => `${t.card_id}:${t.tag_id}`),
			);
			const desiredSet = new Set(
				tagRows.map((t) => `${t.card_id}:${t.tag_id}`),
			);
			const toDelete = (existingTags || []).filter(
				(t) => !desiredSet.has(`${t.card_id}:${t.tag_id}`),
			);
			const toInsert = tagRows.filter(
				(t) => !existingSet.has(`${t.card_id}:${t.tag_id}`),
			);

			if (toDelete.length > 0)
				await supabase
					.from("card_tags")
					.delete()
					.in(
						"id",
						toDelete.map((t) => t.id),
					);
			if (toInsert.length > 0)
				await supabase.from("card_tags").insert(toInsert);
		}

		lastPersistedColIds = currentColIds;
		lastPersistedCardIds = currentCardIds;

		// Touch pages.updated_at so "Edited" badge and recents stay live for kanban edits
		try {
			await supabase
				.from("pages")
				.update({ updated_at: nowIso() })
				.eq("id", options.pageId);
		} catch {
			// best-effort
		}
	};

	const schedulePersist = (currentCols: Column[]) => {
		if (syncTimeout) window.clearTimeout(syncTimeout);
		syncTimeout = window.setTimeout(() => persistToSupabase(currentCols), 1500);
	};

	// Initialize sync ONLY when the doc is loaded
	createEffect(() => {
		const doc = yjs.doc();
		if (!yjs.loaded() || !doc) return;

		const syncLocal = () => {
			const parsed = parseKanbanDoc(doc);
			setColumns(parsed);
			options.onChange?.(parsed);
		};

		const updateHandler = (_update: Uint8Array, origin: YjsUpdateOrigin) => {
			syncLocal();
			if (origin !== "supabase-load" && origin !== "supabase-broadcast") {
				schedulePersist(parseKanbanDoc(doc));
			}
		};

		doc.on("update", updateHandler);

		// Handle first-load hydration from legacy DB
		if (yjs.isNew()) {
			const fetchLegacyData = async () => {
				const { data: colData } = await supabase
					.from("columns")
					.select("*")
					.eq("page_id", options.pageId)
					.order("position", { ascending: true });
				const { data: cardData } = await supabase
					.from("cards")
					.select("*")
					.eq("page_id", options.pageId)
					.order("position", { ascending: true });
				const { data: cardTagData } = await supabase
					.from("card_tags")
					.select("card_id, tag_id")
					.in(
						"card_id",
						(cardData ?? []).map((c) => c.id),
					);

				const tagsByCard = new Map<string, string[]>();
				for (const row of cardTagData ?? []) {
					const existing = tagsByCard.get(row.card_id) ?? [];
					existing.push(row.tag_id);
					tagsByCard.set(row.card_id, existing);
				}

				const cardsByColumn = new Map<string, Card[]>();
				for (const card of cardData ?? []) {
					const existing = cardsByColumn.get(card.column_id) ?? [];
					existing.push(toCard(card, tagsByCard.get(card.id)));
					cardsByColumn.set(card.column_id, existing);
				}

				const mapped: Column[] = (colData ?? []).map((col) => ({
					...toColumn(col),
					cards: (cardsByColumn.get(col.id) ?? []).sort(
						(a, b) => (a.position ?? 0) - (b.position ?? 0),
					),
				}));

				initKanbanDoc(doc, mapped);
				schedulePersist(mapped);
			};
			fetchLegacyData();
		}

		syncLocal();
		// Seed last-persisted tracking from the initially loaded doc so
		// sweep-deletes only remove ids this client has previously persisted.
		if (lastPersistedColIds === null && lastPersistedCardIds === null) {
			const initial = parseKanbanDoc(doc);
			lastPersistedColIds = new Set(initial.map((c) => c.id));
			lastPersistedCardIds = new Set(
				initial.flatMap((c) => c.cards.map((card) => card.id)),
			);
		}

		onCleanup(() => {
			// Flush any pending debounced persist best-effort before the doc changes
			if (syncTimeout) {
				window.clearTimeout(syncTimeout);
				syncTimeout = undefined;
				void persistToSupabase(columns()).catch(() => {});
			}
			doc.off("update", updateHandler);
		});
	});

	onCleanup(() => {
		if (syncTimeout) {
			window.clearTimeout(syncTimeout);
			syncTimeout = undefined;
			void persistToSupabase(columns()).catch(() => {});
		}
	});

	// Keep the open card dialog in sync with remote Yjs updates (focus-guarded merge is in CardDialog)
	createEffect(() => {
		const dlg = cardDialog();
		if (!dlg || dlg.isNew) return;
		const latest = columns()
			.flatMap((c) => c.cards)
			.find((c) => c.id === dlg.card.id);
		if (latest && latest !== dlg.card) setCardDialog({ ...dlg, card: latest });
	});

	const itemsRecord = () =>
		indexBy(
			columns(),
			(column) => column.id,
			(column) => column.cards,
		);

	const reorderColumns = useDragReorder(
		() => columns(),
		(next) => {
			const doc = yjs.doc();
			if (!doc) return;
			mutateKanbanDoc(doc, ({ columnOrder }) => {
				columnOrder.delete(0, columnOrder.length);
				columnOrder.insert(
					0,
					next.map((c) => c.id),
				);
			});
		},
	);

	const onDragEnd: DragDropProviderProps["onDragEnd"] = (e, manager) => {
		const { source, target, canceled } = e.operation;
		const doc = yjs.doc();
		if (!source || !target || canceled || !doc) return;

		if (isSortable(source) && source.initialGroup === BOARD_ID) {
			reorderColumns(e, manager);
			return;
		}

		if (
			target.type === "column-droppable" &&
			typeof target.id === "string" &&
			target.id.endsWith("-cards-droppable") &&
			isSortable(source)
		) {
			const targetColumnId = target.id.replace("-cards-droppable", "");
			const sourceColumnId = source.initialGroup as string;
			const sourceIndex = source.initialIndex;

			if (!sourceColumnId || sourceIndex == null) return;

			mutateKanbanDoc(doc, ({ columnCardsMap }) => {
				const srcCards = columnCardsMap.get(sourceColumnId);
				const tgtCards = columnCardsMap.get(targetColumnId);
				if (srcCards && tgtCards && sourceIndex < srcCards.length) {
					const cardId = srcCards.get(sourceIndex);
					srcCards.delete(sourceIndex, 1);
					tgtCards.insert(tgtCards.length, [cardId]);
				}
			});
			return;
		}

		const record = itemsRecord();
		const next = move(record, e);
		if (next === record) return;

		mutateKanbanDoc(doc, ({ columnCardsMap }) => {
			for (const [colId, cards] of Object.entries(next)) {
				const yCards = columnCardsMap.get(colId);
				if (yCards) {
					yCards.delete(0, yCards.length);
					yCards.insert(
						0,
						cards.map((c) => c.id),
					);
				}
			}
		});
	};

	const openCardDialog = (columnId: string, card: Card) =>
		setCardDialog({ columnId, card });

	const saveCard = async (card: Card) => {
		const columnId = cardDialog()?.columnId;
		const doc = yjs.doc();
		if (!columnId || !doc) return;

		mutateKanbanDoc(doc, ({ cardsMap }) => {
			let cMap = cardsMap.get(card.id);
			if (!cMap) {
				cMap = new Y.Map<string | string[] | null>();
				cardsMap.set(card.id, cMap);
			}
			cMap.set("id", card.id);
			cMap.set("title", card.title);
			cMap.set("description", card.description);
			cMap.set("dueDate", card.dueDate ?? null);
			cMap.set("assigneeIds", card.assigneeIds ?? []);
			cMap.set("tagIds", card.tagIds ?? []);
		});
	};

	const deleteCard = async (columnId: string, cardId: string) => {
		const doc = yjs.doc();
		if (!doc) return;

		await supabase.from("card_tags").delete().eq("card_id", cardId);
		await supabase.from("cards").delete().eq("id", cardId);

		if (options.workspaceId) {
			await logActivity(options.workspaceId, "card", cardId, "card_delete");
		}

		mutateKanbanDoc(doc, ({ cardsMap, columnCardsMap }) => {
			cardsMap.delete(cardId);
			const colCards = columnCardsMap.get(columnId);
			if (colCards) {
				for (let i = 0; i < colCards.length; i++) {
					if (colCards.get(i) === cardId) {
						colCards.delete(i, 1);
						break;
					}
				}
			}
		});
	};

	const addCard = (columnId: string) =>
		setCardDialog({
			columnId,
			card: { id: uid(), title: "", description: "" },
			isNew: true,
		});

	const createCard = async (draft: Card) => {
		const target = cardDialog();
		const doc = yjs.doc();
		if (!target || !doc) return;

		const result = cardDraftSchema.safeParse({
			title: draft.title,
			description: draft.description,
			dueDate: draft.dueDate,
		});
		const title = result.success
			? result.data.title || "Untitled"
			: draft.title.trim() || "Untitled";

		mutateKanbanDoc(doc, ({ cardsMap, columnCardsMap }) => {
			const cMap = new Y.Map<string | string[] | null>();
			cMap.set("id", draft.id);
			cMap.set("title", title);
			cMap.set("description", draft.description);
			cMap.set("dueDate", draft.dueDate ?? null);
			cMap.set("assigneeIds", draft.assigneeIds ?? []);
			cMap.set("tagIds", draft.tagIds ?? []);
			cardsMap.set(draft.id, cMap);

			const colCards = columnCardsMap.get(target.columnId);
			if (colCards) colCards.insert(colCards.length, [draft.id]);
		});
		if (options.workspaceId) {
			await logActivity(options.workspaceId, "card", draft.id, "card_create", {
				title,
			});
		}
	};

	const addColumn = () =>
		setColumnDialog({
			column: {
				id: uid(),
				title: "New Column",
				color: "",
				cards: [],
				position: columns().length,
			},
			isNew: true,
		});

	const saveColumn = async (column: Column) => {
		const doc = yjs.doc();
		if (!doc) return;
		const dialogState = columnDialog();

		if (dialogState?.isNew) {
			mutateKanbanDoc(doc, ({ columnOrder, columnsMap, columnCardsMap }) => {
				const cMap = new Y.Map<string>();
				cMap.set("id", column.id);
				cMap.set("title", column.title);
				cMap.set("color", column.color);
				columnsMap.set(column.id, cMap);
				columnCardsMap.set(column.id, new Y.Array<string>());
				columnOrder.insert(columnOrder.length, [column.id]);
			});
		} else {
			mutateKanbanDoc(doc, ({ columnsMap }) => {
				const cMap = columnsMap.get(column.id);
				if (cMap) {
					cMap.set("title", column.title);
					cMap.set("color", column.color);
				}
			});
		}
		setColumnDialog(null);
	};

	const duplicateColumn = async (column: Column) => {
		const doc = yjs.doc();
		if (!doc) return;
		const colId = column.id;
		const newColId = uid();

		mutateKanbanDoc(
			doc,
			({ columnOrder, columnsMap, columnCardsMap, cardsMap }) => {
				const oldCMap = columnsMap.get(colId);
				const oldCardIds = columnCardsMap.get(colId);
				if (!oldCMap || !oldCardIds) return;

				const cMap = new Y.Map<string>();
				cMap.set("id", newColId);
				cMap.set("title", `${asString(oldCMap.get("title"))} (Copy)`);
				cMap.set("color", asString(oldCMap.get("color")));
				columnsMap.set(newColId, cMap);

				const newCardIds = new Y.Array<string>();
				for (let i = 0; i < oldCardIds.length; i++) {
					const oldId = oldCardIds.get(i);
					const oldCard = cardsMap.get(oldId);
					if (!oldCard) continue;

					const newCardId = uid();
					const cardMap = new Y.Map<string | string[] | null>();
					cardMap.set("id", newCardId);
					cardMap.set("title", asString(oldCard.get("title")));
					cardMap.set("description", asString(oldCard.get("description")));
					cardMap.set("dueDate", asNullableString(oldCard.get("dueDate")));
					cardMap.set("assigneeIds", asStringArray(oldCard.get("assigneeIds")));
					cardMap.set("tagIds", asStringArray(oldCard.get("tagIds")));
					cardsMap.set(newCardId, cardMap);

					newCardIds.insert(i, [newCardId]);
				}
				columnCardsMap.set(newColId, newCardIds);

				let insertIndex = columnOrder.length;
				for (let i = 0; i < columnOrder.length; i++) {
					if (columnOrder.get(i) === colId) {
						insertIndex = i + 1;
						break;
					}
				}
				columnOrder.insert(insertIndex, [newColId]);
			},
		);
	};

	const deleteColumn = async (columnId: string) => {
		const doc = yjs.doc();
		if (!doc) return;

		await supabase.from("cards").delete().eq("column_id", columnId);
		await supabase.from("columns").delete().eq("id", columnId);

		mutateKanbanDoc(
			doc,
			({ columnOrder, columnsMap, columnCardsMap, cardsMap }) => {
				for (let i = 0; i < columnOrder.length; i++) {
					if (columnOrder.get(i) === columnId) {
						columnOrder.delete(i, 1);
						break;
					}
				}
				columnsMap.delete(columnId);
				const cardIds = columnCardsMap.get(columnId);
				if (cardIds) {
					for (let i = 0; i < cardIds.length; i++)
						cardsMap.delete(cardIds.get(i));
				}
				columnCardsMap.delete(columnId);
			},
		);
	};

	onCleanup(() => {
		if (syncTimeout) window.clearTimeout(syncTimeout);
	});

	return {
		columns,
		loaded: yjs.loaded,
		cardDialog,
		setCardDialog,
		columnDialog,
		setColumnDialog,
		confirmDialog,
		setConfirmDialog,
		openCardDialog,
		saveCard,
		deleteCard,
		addCard,
		createCard,
		addColumn,
		saveColumn,
		duplicateColumn,
		deleteColumn,
		onDragEnd,
	};
}
