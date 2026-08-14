import { move } from "@dnd-kit/helpers";
import type { DragDropProviderProps } from "@dnd-kit/solid";
import { isSortable } from "@dnd-kit/solid/sortable";
import { createSignal } from "solid-js";
import { uid } from "#/utils/uid";
import { useDragReorder } from "#/utils/useDragReorder";
import { INITIAL_COLUMNS } from "../constants/data";
import type {
	Card,
	CardDialogState,
	Column,
	ConfirmDialogState,
} from "../types";
import { BOARD_ID } from "../types";

export function useKanbanBoard() {
	const [columns, setColumns] = createSignal<Column[]>(INITIAL_COLUMNS);
	const [cardDialog, setCardDialog] = createSignal<CardDialogState | null>(
		null,
	);
	const [columnDialog, setColumnDialog] = createSignal<Column | null>(null);
	const [confirmDialog, setConfirmDialog] =
		createSignal<ConfirmDialogState | null>(null);

	const itemsRecord = () =>
		Object.fromEntries(columns().map((column) => [column.id, column.cards]));

	const reorderColumns = useDragReorder(
		() => columns(),
		(next) => setColumns(next),
	);

	const onDragEnd: DragDropProviderProps["onDragEnd"] = (e, manager) => {
		const { source, target, canceled } = e.operation;
		if (!source || !target || canceled) return;

		// Column reordering (columns are sortable with group === BOARD_ID)
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

			setColumns((current) => {
				// Remove from source column
				const withoutDragged = current.map((col) =>
					col.id === sourceColumnId
						? {
								...col,
								cards: col.cards.filter((c) => c.id !== draggedCard.id),
							}
						: col,
				);

				// Append to target column
				return withoutDragged.map((col) =>
					col.id === targetColumnId
						? { ...col, cards: [...col.cards, draggedCard] }
						: col,
				);
			});

			return;
		}

		// Normal card-to-card move (existing logic)
		const record = itemsRecord();
		const next = move(record, e);

		if (next === record) return;

		setColumns((current) =>
			current.map((column) => ({
				...column,
				cards: next[column.id] ?? column.cards,
			})),
		);
	};

	const openCardDialog = (columnId: string, card: Card) =>
		setCardDialog({ columnId, card });

	const saveCard = (card: Card) => {
		const columnId = cardDialog()?.columnId;
		if (!columnId) return;

		setColumns((current) =>
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

	const deleteCard = (columnId: string, cardId: string) => {
		setColumns((current) =>
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
			title: "New card",
			description: "",
		};

		setColumns((current) =>
			current.map((column) =>
				column.id === columnId
					? { ...column, cards: [...column.cards, card] }
					: column,
			),
		);
		setCardDialog({ columnId, card });
	};

	const addColumn = () => {
		const column: Column = {
			id: uid(),
			title: "New column",
			color: "",
			cards: [],
		};

		setColumns((current) => [...current, column]);
		setColumnDialog(column);
	};

	const saveColumn = (column: Column) => {
		setColumns((current) =>
			current.map((c) => (c.id === column.id ? column : c)),
		);
	};

	const deleteColumn = (columnId: string) => {
		setColumns((current) => current.filter((c) => c.id !== columnId));
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
		deleteCard,
		addCard,
		addColumn,
		saveColumn,
		deleteColumn,
	};
}
