import { arrayMove, move } from "@dnd-kit/helpers";
import type { DragDropProviderProps } from "@dnd-kit/solid";
import { isSortable } from "@dnd-kit/solid/sortable";
import { createSignal } from "solid-js";
import { INITIAL_COLUMNS } from "./data";
import type {
	Card,
	CardDialogState,
	Column,
	ConfirmDialogState,
} from "./types";
import { BOARD_ID } from "./types";

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

	const onDragEnd: DragDropProviderProps["onDragEnd"] = (event) => {
		const { source, target, canceled } = event.operation;
		if (!source || !target || canceled) return;

		if (isSortable(source) && source.initialGroup === BOARD_ID) {
			const from = source.initialIndex;
			const to = source.index;
			if (from !== to) {
				setColumns((current) => arrayMove(current, from, to));
			}
			return;
		}

		const record = itemsRecord();
		const next = move(record, event);

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
			id: crypto.randomUUID(),
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
			id: crypto.randomUUID(),
			title: "New column",
			color: "#8b5cf6",
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
