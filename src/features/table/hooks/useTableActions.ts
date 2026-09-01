import type {
	CellChangeProps,
	CellValue,
	ColumnDef,
	SolidColumnDef,
	TableAPI,
} from "@simple-table/solid";
import type { GridRow } from "../types";

export const useTableActions = (
	columns: () => SolidColumnDef<GridRow>[],
	rows: () => GridRow[],
	setColumns: (
		fn: (c: SolidColumnDef<GridRow>[]) => SolidColumnDef<GridRow>[],
	) => void,
	setRows: (fn: (r: GridRow[]) => GridRow[]) => void,
	setSelectedRows: (s: Set<string>) => void,
	emitChange: () => void,
	makeColumnDef: (
		accessor: string,
		label: string,
		width?: number,
	) => SolidColumnDef<GridRow>,
	tableApi: () => TableAPI<GridRow> | undefined,
) => {
	const handleCellEdit = ({ accessor, newValue, row }: CellChangeProps) => {
		if (accessor === "__add_column__") return;

		setRows((current) => {
			const index = current.findIndex((r) => r.id === row.id);
			if (index === -1) return current;

			const next = [...current];
			next[index] = { ...next[index], [accessor]: newValue };

			tableApi()?.updateData({ rowIndex: index, accessor, newValue });

			return next;
		});
		emitChange();
	};

	const handleHeaderEdit = (
		header: ColumnDef<GridRow, CellValue>,
		newLabel: string,
	) => {
		setColumns((current) =>
			current.map((column) =>
				column.accessor === header.accessor
					? { ...column, label: newLabel }
					: column,
			),
		);
		emitChange();
	};

	const deleteColumnDef = (column: SolidColumnDef<GridRow>) => {
		const accessor = column.accessor;
		setColumns((current) => current.filter((col) => col.accessor !== accessor));
		setRows((current) =>
			current.map((row) => {
				const next: GridRow = { ...row };
				delete next[accessor];
				return next;
			}),
		);
		void tableApi()?.clearFilter(accessor);
		emitChange();
	};

	const handleColumnDuplicate = (header: ColumnDef<GridRow, CellValue>) => {
		const source = columns().find(
			(column) => column.accessor === header.accessor,
		);
		if (!source) return;

		const existing = new Set(columns().map((column) => column.accessor));
		let newAccessor = `${source.accessor}_copy`;
		let counter = 2;
		while (existing.has(newAccessor)) {
			newAccessor = `${source.accessor}_copy${counter}`;
			counter += 1;
		}

		const duplicated = makeColumnDef(
			newAccessor,
			`${source.label} copy`,
			typeof source.width === "number" ? source.width : undefined,
		);

		setColumns((current) => {
			const index = current.findIndex(
				(column) => column.accessor === source.accessor,
			);
			if (index === -1) return current;
			const next = [...current];
			next.splice(index + 1, 0, duplicated);
			return next;
		});
		setRows((current) =>
			current.map((row) => ({
				...row,
				[newAccessor]: row[source.accessor],
			})),
		);
		emitChange();
	};

	const deleteRows = (idsToDelete: Iterable<string> | string[]) => {
		const ids = new Set(idsToDelete);
		if (ids.size === 0) return;

		setRows((current) => current.filter((row) => !ids.has(row.id)));
		setSelectedRows(new Set<string>());
		tableApi()?.clearRowSelection();
		emitChange();
	};

	const addRow = (targetRowId?: string, e?: MouseEvent) => {
		const nextIndex = rows().length;
		const newRow: GridRow = {
			id: `row_${Date.now()}_${nextIndex + 1}`,
			...Object.fromEntries(columns().map((column) => [column.accessor, ""])),
		};

		if (!targetRowId) {
			setRows((current) => [...current, newRow]);
			emitChange();
			return;
		}

		setRows((current) => {
			const index = current.findIndex((r) => r.id === targetRowId);
			if (index === -1) return [...current, newRow];

			const isShift = e?.shiftKey ?? false;
			const insertIndex = isShift ? index : index + 1;

			const updated = [...current];
			updated.splice(insertIndex, 0, newRow);
			return updated;
		});
		emitChange();
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
