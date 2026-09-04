import * as Y from "yjs";
import { asNullableString, asString, asStringArray } from "#/utils/yjs/types";
import type { Card, Column } from "../types";

type ColumnCellValue = string;
type CardCellValue = string | string[] | null;

export function initKanbanDoc(ydoc: Y.Doc, initialColumns: Column[]) {
	const columnOrder = ydoc.getArray<string>("columnOrder");
	const columnsMap = ydoc.getMap<Y.Map<ColumnCellValue>>("columns");
	const columnCardsMap = ydoc.getMap<Y.Array<string>>("columnCards");
	const cardsMap = ydoc.getMap<Y.Map<CardCellValue>>("cards");

	ydoc.transact(() => {
		const order: string[] = [];
		for (const col of initialColumns) {
			order.push(col.id);

			const cMap = new Y.Map<ColumnCellValue>();
			cMap.set("id", col.id);
			cMap.set("title", col.title);
			cMap.set("color", col.color);
			columnsMap.set(col.id, cMap);

			const cardIds: string[] = [];
			for (const card of col.cards) {
				cardIds.push(card.id);

				const cardMap = new Y.Map<CardCellValue>();
				cardMap.set("id", card.id);
				cardMap.set("title", card.title);
				cardMap.set("description", card.description);
				cardMap.set("dueDate", card.dueDate ?? null);
				cardMap.set("assigneeIds", card.assigneeIds ?? []);
				cardMap.set("tagIds", card.tagIds ?? []);
				cardsMap.set(card.id, cardMap);
			}

			const yCardIds = new Y.Array<string>();
			yCardIds.insert(0, cardIds);
			columnCardsMap.set(col.id, yCardIds);
		}
		if (columnOrder.length === 0 && order.length > 0) {
			columnOrder.insert(0, order);
		}
	});
}

export function parseKanbanDoc(ydoc: Y.Doc): Column[] {
	const columnOrder = ydoc.getArray<string>("columnOrder").toArray();
	const columnsMap = ydoc.getMap<Y.Map<ColumnCellValue>>("columns");
	const columnCardsMap = ydoc.getMap<Y.Array<string>>("columnCards");
	const cardsMap = ydoc.getMap<Y.Map<CardCellValue>>("cards");

	const result: Column[] = [];
	for (let i = 0; i < columnOrder.length; i++) {
		const colId = columnOrder[i];
		const colData = columnsMap.get(colId);
		if (!colData) continue;

		const cardIds = columnCardsMap.get(colId)?.toArray() || [];
		const cards: Card[] = [];
		for (let j = 0; j < cardIds.length; j++) {
			const cardId = cardIds[j];
			const cardData = cardsMap.get(cardId);
			if (!cardData) continue;

			cards.push({
				id: cardId,
				title: asString(cardData.get("title")),
				description: asString(cardData.get("description")),
				dueDate: asNullableString(cardData.get("dueDate")),
				assigneeIds: asStringArray(cardData.get("assigneeIds")),
				tagIds: asStringArray(cardData.get("tagIds")),
				position: j,
			});
		}

		result.push({
			id: colId,
			title: asString(colData.get("title")),
			color: asString(colData.get("color")),
			position: i,
			cards,
		});
	}
	return result;
}

export function mutateKanbanDoc(
	ydoc: Y.Doc,
	fn: (data: {
		columnOrder: Y.Array<string>;
		columnsMap: Y.Map<Y.Map<ColumnCellValue>>;
		columnCardsMap: Y.Map<Y.Array<string>>;
		cardsMap: Y.Map<Y.Map<CardCellValue>>;
	}) => void,
) {
	ydoc.transact(() => {
		fn({
			columnOrder: ydoc.getArray<string>("columnOrder"),
			columnsMap: ydoc.getMap<Y.Map<ColumnCellValue>>("columns"),
			columnCardsMap: ydoc.getMap<Y.Array<string>>("columnCards"),
			cardsMap: ydoc.getMap<Y.Map<CardCellValue>>("cards"),
		});
	});
}
