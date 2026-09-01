import type { CellValue } from "@simple-table/solid";

export type GridRow = { id: string } & Record<string, CellValue>;

export interface SerializedColumn {
	accessor: string;
	label: string;
	width: number;
}

export interface SerializedTable {
	columns: SerializedColumn[];
	rows: GridRow[];
}
