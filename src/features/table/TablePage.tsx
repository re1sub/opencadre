import type {
	CellChangeProps,
	CellValue,
	ColumnDef,
	SolidColumnDef,
	SortColumn,
} from "@simple-table/solid";
import { SimpleTable } from "@simple-table/solid";
import { createMemo, createSignal, onMount } from "solid-js";
import "@simple-table/solid/styles.css";
import { useTheme } from "#/theme/ThemeProvider";
import { EditableHeader } from "./components/EditableHeader";
import { TABLE_ICONS } from "./constants/constants";
import { tablePage } from "./tablePage.css";

type GridRow = { id: string } & Record<string, CellValue>;

const ADD_COL_ACCESSOR = "__add_column__";
const ADD_ROW_ID = "__add_row__";

export function TablePage() {
	const { theme } = useTheme();
	const [columns, setColumns] = createSignal<SolidColumnDef<GridRow>[]>([]);
	const [rows, setRows] = createSignal<GridRow[]>([]);

	const addRow = () => {
		const nextIndex = rows().length;
		const row: GridRow = {
			id: `row_${nextIndex + 1}`,
			...Object.fromEntries(columns().map((column) => [column.accessor, ""])),
		};
		setRows((current) => [...current, row]);
	};

	const addColumn = () => {
		const nextColumnNumber = columns().length + 1;
		const accessor = `col_${nextColumnNumber}`;

		const column: SolidColumnDef<GridRow> = {
			accessor,
			label: `Column ${nextColumnNumber}`,
			width: 200,
			sortable: true,
			editable: true,
			// disableReorder: true,
			headerRenderer: (props) => (
				<EditableHeader
					header={props.header}
					components={props.components}
					onHeaderEdit={handleHeaderEdit}
				/>
			),
		};

		setColumns((current) => [...current, column]);
		setRows((current) => current.map((row) => ({ ...row, [accessor]: "" })));
	};

	const handleCellEdit = ({ accessor, newValue, row }: CellChangeProps) => {
		// Ignore editing inside the dummy action row/column
		if (row.id === ADD_ROW_ID || accessor === ADD_COL_ACCESSOR) return;

		setRows((current) =>
			current.map((entry) =>
				entry.id === row.id ? { ...entry, [accessor]: newValue } : entry,
			),
		);
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
	};

	const gridColumns = createMemo(() => {
		const addColumnDef: SolidColumnDef<GridRow> = {
			accessor: ADD_COL_ACCESSOR,
			label: "",
			width: 140,
			sortable: false,
			editable: false,
			disableReorder: true,
			headerRenderer: () => (
				<wa-button
					type="button"
					size="s"
					variant="neutral"
					appearance="plain"
					onClick={addColumn}
					style={{ width: "100%" }}
				>
					<wa-icon slot="start" name="plus"></wa-icon>
					Add column
				</wa-button>
			),
			cellRenderer: () => null, // Empty cell for real data rows
		};

		return [...columns(), addColumnDef];
	});

	const gridRows = createMemo(() => {
		const userRows = rows();

		const addRowData: GridRow = {
			id: ADD_ROW_ID,
			...Object.fromEntries(columns().map((col) => [col.accessor, ""])),
		};

		return [...userRows, addRowData];
	});

	// Custom cell renderer override to render the "Add Row" button on the dummy row's first column
	const finalColumns = createMemo<SolidColumnDef<GridRow>[]>(() => {
		const cols = gridColumns();
		if (cols.length === 0) return [];

		const firstColAccessor = cols[0].accessor;

		return cols.map(
			(col): SolidColumnDef<GridRow> => ({
				...col,
				cellRenderer: (props) => {
					if (props.row.id === ADD_ROW_ID) {
						if (col.accessor === firstColAccessor) {
							return (
								<wa-button
									type="button"
									size="s"
									variant="neutral"
									appearance="plain"
									onClick={addRow}
									style={{ width: "100%", "pointer-events": "auto" }}
								>
									<wa-icon slot="start" name="plus"></wa-icon>
									Add row
								</wa-button>
							);
						}
						return null;
					}

					// Fall back to custom column renderer if defined
					if (col.cellRenderer) {
						return col.cellRenderer(props);
					}

					// Standard cell default value: ensure return type is JSX compatible (string/number/null)
					if (props.value == null) return null;
					if (typeof props.value === "object")
						return JSON.stringify(props.value);
					return String(props.value);
				},
			}),
		);
	});

	// Handle sorting
	const handleSortChange = (sort: SortColumn | null) => {
		if (!sort?.direction) return; // Default or cleared sort order

		const accessor = sort.key.accessor;
		const direction = sort.direction;

		setRows((current) => {
			// 1. Separate user data rows from the action row if present
			const dataRows = current.filter((row) => row.id !== ADD_ROW_ID);

			// 2. Sort only the real data rows
			const sortedRows = [...dataRows].sort((a, b) => {
				const valA = a[accessor] ?? "";
				const valB = b[accessor] ?? "";

				const comparison = String(valA).localeCompare(String(valB), undefined, {
					numeric: true,
					sensitivity: "base",
				});

				return direction === "asc" ? comparison : -comparison;
			});

			// 3. Return sorted data rows (gridRows memo will automatically append ADD_ROW_ID at the end)
			return sortedRows;
		});
	};

	// Initialize default columns and rows on mount
	onMount(() => {
		if (columns().length === 0) {
			addColumn();
			for (let i = 1; i < 4; i++) {
				addRow();
			}
		}
	});

	return (
		<div class={tablePage}>
			<SimpleTable
				columns={finalColumns()}
				rows={gridRows()}
				rowsPerPage={8}
				customTheme={{ rowHeight: 38 }}
				columnReordering
				columnResizing
				selectableCells
				getRowId={({ row }) => row.id}
				onCellEdit={handleCellEdit}
				externalSortHandling
				onSortChange={handleSortChange}
				theme={theme()}
				icons={TABLE_ICONS}
			/>
		</div>
	);
}
