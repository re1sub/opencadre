import { move } from "@dnd-kit/helpers";
import type { DragDropProviderProps } from "@dnd-kit/solid";
import { isSortable } from "@dnd-kit/solid/sortable";
import { createEffect, createSignal } from "solid-js";
import type { Tables } from "#/types/database";
import { supabase } from "#/utils/supabase";
import { uid } from "#/utils/uid";
import { useDragReorder } from "#/utils/useDragReorder";
import { cardDraftSchema } from "../schemas";
import type {
	Card,
	CardDialogState,
	Column,
	ConfirmDialogState,
} from "../types";
import { BOARD_ID } from "../types";

type ColumnRow = Tables<"columns">;
type CardRow = Tables<"cards">;

const toColumn = (row: ColumnRow): Column => ({
	id: row.id,
	title: row.title,
	color: row.color ?? "",
	cards: [],
});

const toCard = (row: CardRow): Card => ({
	id: row.id,
	title: row.title,
	description: row.description ?? "",
	dueDate: row.due_date,
	assigneeIds: row.assignee_ids ?? [],
});

interface UseKanbanBoardAdapterOptions {
	pageId: string;
	onChange?: (columns: Column[]) => void;
}

export function useKanbanBoardAdapter(options: UseKanbanBoardAdapterOptions) {
	const [columns, setColumns] = createSignal<Column[]>([]);
	const [cardDialog, setCardDialog] = createSignal<CardDialogState | null>(
		null,
	);
	const [columnDialog, setColumnDialog] = createSignal<Column | null>(null);
	const [confirmDialog, setConfirmDialog] =
		createSignal<ConfirmDialogState | null>(null);
	const [loaded, setLoaded] = createSignal(false);

	// Fetch columns and cards from Supabase
	const fetchData = async () => {
		const { data: colData, error: colError } = await supabase
			.from("columns")
			.select("*")
			.eq("page_id", options.pageId)
			.order("position", { ascending: true });
		if (colError) throw colError;

		const { data: cardData, error: cardError } = await supabase
			.from("cards")
			.select("*")
			.eq("page_id", options.pageId)
			.order("position", { ascending: true });
		if (cardError) throw cardError;

		const cardsByColumn = new Map<string, Card[]>();
		for (const card of cardData ?? []) {
			const existing = cardsByColumn.get(card.column_id) ?? [];
			existing.push(toCard(card));
			cardsByColumn.set(card.column_id, existing);
		}

		const mapped: Column[] = (colData ?? []).map((col) => ({
			...toColumn(col),
			cards: cardsByColumn.get(col.id) ?? [],
		}));

		setColumns(mapped);
		setLoaded(true);
	};

	createEffect(() => {
		if (options.pageId) fetchData();
	});

	const emitChange = (next: Column[]) => {
		options?.onChange?.(next);
	};

	const updateColumns = (fn: (current: Column[]) => Column[]) => {
		setColumns((current) => {
			const next = fn(current);
			emitChange(next);
			return next;
		});
	};

	const itemsRecord = () =>
		Object.fromEntries(columns().map((column) => [column.id, column.cards]));

	const reorderColumns = useDragReorder(
		() => columns(),
		(next) => {
			setColumns(() => next);
			emitChange(next);
			// Persist positions
			const ids = next.map((c) => c.id);
			ids.forEach((id, index) => {
				supabase.from("columns").update({ position: index }).eq("id", id);
			});
		},
	);

	const onDragEnd: DragDropProviderProps["onDragEnd"] = (e, manager) => {
		const { source, target, canceled } = e.operation;
		if (!source || !target || canceled) return;

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

			const sourceColumn = columns().find((c) => c.id === sourceColumnId);
			if (!sourceColumn) return;

			const draggedCard = sourceColumn.cards[sourceIndex];
			if (!draggedCard) return;

			updateColumns((current) => {
				const withoutDragged = current.map((col) =>
					col.id === sourceColumnId
						? {
								...col,
								cards: col.cards.filter((c) => c.id !== draggedCard.id),
							}
						: col,
				);
				return withoutDragged.map((col) =>
					col.id === targetColumnId
						? { ...col, cards: [...col.cards, draggedCard] }
						: col,
				);
			});

			// Persist move in DB
			supabase
				.from("cards")
				.update({ column_id: targetColumnId })
				.eq("id", draggedCard.id);

			return;
		}

		const record = itemsRecord();
		const next = move(record, e);
		if (next === record) return;

		updateColumns((current) =>
			current.map((column) => ({
				...column,
				cards: next[column.id] ?? column.cards,
			})),
		);
	};

	const openCardDialog = (columnId: string, card: Card) =>
		setCardDialog({ columnId, card });

	const saveCard = async (card: Card) => {
		const columnId = cardDialog()?.columnId;
		if (!columnId) return;

		const { error } = await supabase
			.from("cards")
			.update({
				title: card.title,
				description: card.description || null,
				due_date: card.dueDate ?? null,
				assignee_ids: card.assigneeIds ?? [],
			})
			.eq("id", card.id);
		if (error) throw error;

		updateColumns((current) =>
			current.map((column) =>
				column.id === columnId
					? {
							...column,
							cards: column.cards.map((c) => (c.id === card.id ? card : c)),
						}
					: column,
			),
		);
	};

	const deleteCard = async (columnId: string, cardId: string) => {
		const { error } = await supabase.from("cards").delete().eq("id", cardId);
		if (error) throw error;

		updateColumns((current) =>
			current.map((column) =>
				column.id === columnId
					? { ...column, cards: column.cards.filter((c) => c.id !== cardId) }
					: column,
			),
		);
	};

	const addCard = (columnId: string) => {
		const card: Card = {
			id: uid(),
			title: "",
			description: "",
		};
		setCardDialog({ columnId, card, isNew: true });
	};

	const createCard = async (draft: Card) => {
		const target = cardDialog();
		if (!target) return;

		const result = cardDraftSchema.safeParse({
			title: draft.title,
			description: draft.description,
			dueDate: draft.dueDate,
		});

		const title = result.success
			? result.data.title || "Untitled"
			: draft.title.trim() || "Untitled";

		const targetColumn = columns().find((c) => c.id === target.columnId);
		const position = targetColumn?.cards.length ?? 0;

		const { data, error } = await supabase
			.from("cards")
			.insert({
				column_id: target.columnId,
				page_id: options.pageId,
				title,
				description: draft.description || null,
				due_date: draft.dueDate ?? null,
				assignee_ids: draft.assigneeIds ?? [],
				position,
			})
			.select()
			.single();
		if (error) throw error;

		const card: Card = toCard(data);

		updateColumns((current) =>
			current.map((column) =>
				column.id === target.columnId
					? { ...column, cards: [...column.cards, card] }
					: column,
			),
		);
	};

	const addColumn = async () => {
		const targetColumn = columns();
		const position = targetColumn.length;

		const { data, error } = await supabase
			.from("columns")
			.insert({
				page_id: options.pageId,
				title: "New column",
				position,
			})
			.select()
			.single();
		if (error) throw error;

		const column: Column = {
			...toColumn(data),
			cards: [],
		};

		updateColumns((current) => [...current, column]);
		setColumnDialog(column);
	};

	const saveColumn = async (column: Column) => {
		const { error } = await supabase
			.from("columns")
			.update({ title: column.title, color: column.color || null })
			.eq("id", column.id);
		if (error) throw error;

		updateColumns((current) =>
			current.map((c) => (c.id === column.id ? column : c)),
		);
	};

	const deleteColumn = async (columnId: string) => {
		const { error } = await supabase
			.from("columns")
			.delete()
			.eq("id", columnId);
		if (error) throw error;

		updateColumns((current) => current.filter((c) => c.id !== columnId));
	};

	return {
		columns,
		cardDialog,
		columnDialog,
		confirmDialog,
		setCardDialog,
		setColumnDialog,
		setConfirmDialog,
		onDragEnd,
		openCardDialog,
		saveCard,
		createCard,
		deleteCard,
		addCard,
		addColumn,
		saveColumn,
		deleteColumn,
		loaded,
	};
}
