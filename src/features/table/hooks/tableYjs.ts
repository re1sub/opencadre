import type { CellValue } from "@simple-table/solid";
import * as Y from "yjs";
import { asNumber, asString } from "#/utils/yjs/types";
import type { GridRow, SerializedColumn, SerializedTable } from "../types";

type ColumnCellValue = SerializedColumn[keyof SerializedColumn];
type RowCellValue = CellValue;

export function initTableDoc(ydoc: Y.Doc, initialData: SerializedTable) {
	const colOrder = ydoc.getArray<string>("columnOrder");
	const colsMap = ydoc.getMap<Y.Map<ColumnCellValue>>("columns");
	const rowOrder = ydoc.getArray<string>("rowOrder");
	const rowsMap = ydoc.getMap<Y.Map<RowCellValue>>("rows");

	ydoc.transact(() => {
		const cOrder: string[] = [];
		for (const col of initialData.columns) {
			cOrder.push(col.accessor);
			const cMap = new Y.Map<ColumnCellValue>();
			cMap.set("accessor", col.accessor);
			cMap.set("label", col.label);
			cMap.set("width", col.width);
			colsMap.set(col.accessor, cMap);
		}
		if (colOrder.length === 0 && cOrder.length > 0) {
			colOrder.insert(0, cOrder);
		}

		const rOrder: string[] = [];
		for (const row of initialData.rows) {
			rOrder.push(row.id);
			const rMap = new Y.Map<RowCellValue>();
			for (const [key, value] of Object.entries(row)) {
				rMap.set(key, value as RowCellValue);
			}
			rowsMap.set(row.id, rMap);
		}
		if (rowOrder.length === 0 && rOrder.length > 0) {
			rowOrder.insert(0, rOrder);
		}
	});
}

export function parseTableDoc(ydoc: Y.Doc): SerializedTable {
	const colOrder = ydoc.getArray<string>("columnOrder").toArray();
	const colsMap = ydoc.getMap<Y.Map<ColumnCellValue>>("columns");
	const rowOrder = ydoc.getArray<string>("rowOrder").toArray();
	const rowsMap = ydoc.getMap<Y.Map<RowCellValue>>("rows");

	const columns: SerializedColumn[] = [];
	for (const acc of colOrder) {
		const cMap = colsMap.get(acc);
		if (cMap) {
			columns.push({
				accessor: asString(cMap.get("accessor")) || acc,
				label: asString(cMap.get("label")),
				width: asNumber(cMap.get("width")),
			});
		}
	}

	const rows: GridRow[] = [];
	for (const rId of rowOrder) {
		const rMap = rowsMap.get(rId);
		if (rMap) {
			const row: GridRow = { id: rId };
			for (const key of rMap.keys()) {
				row[key] = rMap.get(key);
			}
			rows.push(row);
		}
	}

	return { columns, rows };
}

export function mutateTableDoc(
	ydoc: Y.Doc,
	fn: (data: {
		colOrder: Y.Array<string>;
		colsMap: Y.Map<Y.Map<ColumnCellValue>>;
		rowOrder: Y.Array<string>;
		rowsMap: Y.Map<Y.Map<RowCellValue>>;
	}) => void,
) {
	ydoc.transact(() => {
		fn({
			colOrder: ydoc.getArray<string>("columnOrder"),
			colsMap: ydoc.getMap<Y.Map<ColumnCellValue>>("columns"),
			rowOrder: ydoc.getArray<string>("rowOrder"),
			rowsMap: ydoc.getMap<Y.Map<RowCellValue>>("rows"),
		});
	});
}
