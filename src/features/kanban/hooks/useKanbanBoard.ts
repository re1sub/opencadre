import { move } from "@dnd-kit/helpers";
import type { DragDropProviderProps } from "@dnd-kit/solid";
import { isSortable } from "@dnd-kit/solid/sortable";
import { createSignal } from "solid-js";
import { uid } from "#/utils/uid";
import { useDragReorder } from "#/utils/useDragReorder";
import { INITIAL_COLUMNS } from "../constants/data";
import { cardDraftSchema } from "../schemas";
import type {
	Card,
	CardDialogState,
	Column,
	ConfirmDialogState,
} from "../types";
import { BOARD_ID } from "../types";

interface UseKanbanBoardOptions {
	initialColumns?: Column[];
	onChange?: (columns: Column[]) => void;
}

export function useKanbanBoard(options?: UseKanbanBoardOptions) {
	const [columns, setColumns] = createSignal<Column[]>(
		options?.initialColumns ?? INITIAL_COLUMNS,
	);
	const [cardDialog, setCardDialog] = createSignal<CardDialogState | null>(
		null,
	);
	const [columnDialog, setColumnDialog] = createSignal<Column | null>(null);
	const [confirmDialog, setConfirmDialog] =
		createSignal<ConfirmDialogState | null>(null);

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
		},
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

			updateColumns((current) => {
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

		updateColumns((current) =>
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

	const deleteCard = (columnId: string, cardId: string) => {
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

	const createCard = (draft: Card) => {
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

		const card: Card = {
			...draft,
			title,
		};

		updateColumns((current) =>
			current.map((column) =>
				column.id === target.columnId
					? { ...column, cards: [...column.cards, card] }
					: column,
			),
		);
	};

	const addColumn = () => {
		const column: Column = {
			id: uid(),
			title: "New column",
			color: "",
			cards: [],
		};

		updateColumns((current) => [...current, column]);
		setColumnDialog(column);
	};

	const saveColumn = (column: Column) => {
		updateColumns((current) =>
			current.map((c) => (c.id === column.id ? column : c)),
		);
	};

	const deleteColumn = (columnId: string) => {
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
	};
}
