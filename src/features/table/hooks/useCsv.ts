import type { SolidColumnDef, TableAPI } from "@simple-table/solid";
import { parseCsv } from "#/utils/misc";
import type { GridRow } from "../types";

export const useCsv = (
	columns: () => SolidColumnDef<GridRow>[],
	rows: () => GridRow[],
	setColumns: (
		fn: (c: SolidColumnDef<GridRow>[]) => SolidColumnDef<GridRow>[],
	) => void,
	setRows: (fn: (r: GridRow[]) => GridRow[]) => void,
	makeColumnDef: (
		accessor: string,
		label: string,
		width?: number,
	) => SolidColumnDef<GridRow>,
	emitChange: () => void,
	_title: string | undefined,
	_tableApi: () => TableAPI<GridRow> | undefined,
) => {
	const importCsv = (text: string) => {
		const parsedRows = parseCsv(text);
		if (parsedRows.length === 0) return;

		// 1. Collect all unique headers from CSV
		const csvHeaders = [...new Set(parsedRows.flatMap((r) => Object.keys(r)))];

		// 2. Map CSV headers -> existing accessors (by label)
		const headerToAccessor = new Map<string, string>();
		const newColumns: { accessor: string; label: string }[] = [];

		for (const header of csvHeaders) {
			const existing = columns().find(
				(c) => c.label?.trim().toLowerCase() === header.toLowerCase(),
			);
			if (existing) {
				headerToAccessor.set(header, existing.accessor);
			} else {
				const accessor = `col_${columns().length + newColumns.length + 1}`;
				headerToAccessor.set(header, accessor);
				newColumns.push({ accessor, label: header });
			}
		}

		// 3. Add new columns to state
		if (newColumns.length > 0) {
			setColumns((current) => [
				...current,
				...newColumns.map((c) => makeColumnDef(c.accessor, c.label)),
			]);
		}

		// 4. Convert each CSV row object to GridRow
		const currentColumns = columns();
		const allAccessors = [
			...currentColumns.map((c) => c.accessor),
			...newColumns.map((c) => c.accessor),
		];

		const newRows = parsedRows.map((csvRow, i) => {
			const row: GridRow = {
				id: `row_${Date.now()}_${rows().length + i + 1}`,
				...Object.fromEntries(allAccessors.map((a) => [a, ""])),
			};
			for (const [header, value] of Object.entries(csvRow)) {
				const accessor = headerToAccessor.get(header);
				if (accessor) row[accessor] = value ?? "";
			}
			return row;
		});

		// 5. Ensure existing rows have new column keys
		if (newColumns.length > 0) {
			setRows((current) =>
				current.map((r) => {
					const next = { ...r };
					for (const c of newColumns)
						if (!(c.accessor in next)) next[c.accessor] = "";
					return next;
				}),
			);
		}

		// 6. Append new rows
		setRows((current) => [...current, ...newRows]);
		emitChange();
	};

	return { importCsv };
};
