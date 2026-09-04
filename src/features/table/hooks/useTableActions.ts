import type {
	CellChangeProps,
	CellValue,
	ColumnDef,
	SolidColumnDef,
	TableAPI,
} from "@simple-table/solid";
import * as Y from "yjs";
import type { GridRow } from "../types";
import { mutateTableDoc } from "./tableYjs";

export const useTableActions = (
	columns: () => SolidColumnDef<GridRow>[],
	rows: () => GridRow[],
	ydoc: () => Y.Doc | null | undefined,
	setSelectedRows: (s: Set<string>) => void,
	tableApi: () => TableAPI<GridRow> | undefined,
) => {
	const handleCellEdit = ({ accessor, newValue, row }: CellChangeProps) => {
		if (accessor === "__add_column__") return;
		const doc = ydoc();
		if (!doc) return;

		mutateTableDoc(doc, ({ rowsMap }) => {
			const rMap = rowsMap.get(row.id as string);
			if (rMap) {
				rMap.set(accessor as string, newValue);
			}
		});

		const index = rows().findIndex((r) => r.id === row.id);
		if (index !== -1) {
			tableApi()?.updateData({ rowIndex: index, accessor, newValue });
		}
	};

	const handleHeaderEdit = (
		header: ColumnDef<GridRow, CellValue>,
		newLabel: string,
	) => {
		const doc = ydoc();
		if (!doc) return;
		mutateTableDoc(doc, ({ colsMap }) => {
			const cMap = colsMap.get(header.accessor as string);
			if (cMap) {
				cMap.set("label", newLabel);
			}
		});
	};

	const deleteColumnDef = (column: SolidColumnDef<GridRow>) => {
		const accessor = column.accessor as string;
		const doc = ydoc();
		if (!doc) return;

		mutateTableDoc(doc, ({ colOrder, colsMap, rowOrder, rowsMap }) => {
			for (let i = 0; i < colOrder.length; i++) {
				if (colOrder.get(i) === accessor) {
					colOrder.delete(i, 1);
					break;
				}
			}
			colsMap.delete(accessor);

			for (const rId of rowOrder) {
				const rMap = rowsMap.get(rId);
				if (rMap) rMap.delete(accessor);
			}
		});

		void tableApi()?.clearFilter(accessor);
	};

	const handleColumnDuplicate = (header: ColumnDef<GridRow, CellValue>) => {
		const doc = ydoc();
		if (!doc) return;

		const source = columns().find((c) => c.accessor === header.accessor);
		if (!source) return;

		const existing = new Set(columns().map((c) => c.accessor));
		let newAccessor = `${source.accessor as string}_copy`;
		let counter = 2;
		while (existing.has(newAccessor)) {
			newAccessor = `${source.accessor as string}_copy${counter}`;
			counter += 1;
		}

		mutateTableDoc(doc, ({ colOrder, colsMap, rowOrder, rowsMap }) => {
			const sourceCMap = colsMap.get(source.accessor as string);
			if (!sourceCMap) return;

			const cMap = new Y.Map<string | number>();
			cMap.set("accessor", newAccessor);
			cMap.set("label", `${sourceCMap.get("label") ?? ""} copy`);
			cMap.set("width", sourceCMap.get("width") ?? 200);
			colsMap.set(newAccessor, cMap);

			let insertIndex = colOrder.length;
			for (let i = 0; i < colOrder.length; i++) {
				if (colOrder.get(i) === source.accessor) {
					insertIndex = i + 1;
					break;
				}
			}
			colOrder.insert(insertIndex, [newAccessor]);

			for (const rId of rowOrder) {
				const rMap = rowsMap.get(rId);
				if (rMap) {
					rMap.set(newAccessor, rMap.get(source.accessor as string));
				}
			}
		});
	};

	const deleteRows = (idsToDelete: Iterable<string> | string[]) => {
		const doc = ydoc();
		if (!doc) return;

		const ids = new Set(idsToDelete);
		if (ids.size === 0) return;

		mutateTableDoc(doc, ({ rowOrder, rowsMap }) => {
			let i = 0;
			while (i < rowOrder.length) {
				const rId = rowOrder.get(i);
				if (ids.has(rId)) {
					rowOrder.delete(i, 1);
					rowsMap.delete(rId);
				} else {
					i++;
				}
			}
		});

		setSelectedRows(new Set<string>());
		tableApi()?.clearRowSelection();
	};

	const addRow = (targetRowId?: string, e?: MouseEvent) => {
		const doc = ydoc();
		if (!doc) return;

		const newRowId = `row_${Date.now()}_${rows().length + 1}`;

		mutateTableDoc(doc, ({ rowOrder, rowsMap, colOrder }) => {
			const rMap = new Y.Map<CellValue>();
			for (let i = 0; i < colOrder.length; i++) {
				rMap.set(colOrder.get(i), "");
			}
			rowsMap.set(newRowId, rMap);

			let insertIndex = rowOrder.length;
			if (targetRowId) {
				for (let i = 0; i < rowOrder.length; i++) {
					if (rowOrder.get(i) === targetRowId) {
						insertIndex = (e?.shiftKey ?? false) ? i : i + 1;
						break;
					}
				}
			}
			rowOrder.insert(insertIndex, [newRowId]);
		});
	};

	return {
		handleCellEdit,
		handleHeaderEdit,
		handleColumnDuplicate,
		deleteColumnDef,
		deleteRows,
		addRow,
	};
};
