import type {
	CellChangeProps,
	CellValue,
	ColumnDef,
	ComparatorProps,
	HeaderRendererComponents,
	SolidColumnDef,
	TableAPI,
} from "@simple-table/solid";
import { SimpleTable } from "@simple-table/solid";
import { createMemo, createSignal, onMount } from "solid-js";
import "@simple-table/solid/styles.css";
import EditableHeader from "#/features/table/components/EditableHeader";
import { TABLE_ICONS } from "#/features/table/constants/constants";
import { INITIAL_COLUMNS, INITIAL_ROWS } from "#/features/table/constants/data";
import { floatingAddRowBtn, tablePage } from "#/features/table/tablePage.css";
import { useTheme } from "#/theme/ThemeProvider";

type GridRow = { id: string } & Record<string, CellValue>;

const ADD_COL_ACCESSOR = "__add_column__";

interface TablePageProps {
	content?: string;
	onChangeContent?: (content: string) => void;
}

interface SerializedColumn {
	accessor: string;
	label: string;
	width: number;
}

interface SerializedTable {
	columns: SerializedColumn[];
	rows: GridRow[];
}

const parseTableContent = (content: string): SerializedTable | null => {
	if (!content) return null;
	try {
		const parsed = JSON.parse(content);
		if (parsed && Array.isArray(parsed.columns) && Array.isArray(parsed.rows)) {
			return parsed;
		}
		return null;
	} catch {
		return null;
	}
};

const makeEmptyLastComparator = () => {
	return (props: ComparatorProps<GridRow, CellValue>) => {
		const aEmpty = props.valueA == null || props.valueA === "";
		const bEmpty = props.valueB == null || props.valueB === "";
		if (aEmpty && bEmpty) return 0;
		if (aEmpty) return props.direction === "asc" ? 1 : -1;
		if (bEmpty) return props.direction === "asc" ? -1 : 1;
		return String(props.valueA).localeCompare(String(props.valueB));
	};
};

const TablePage = (props: TablePageProps) => {
	const { theme } = useTheme();
	const [columns, setColumns] = createSignal<SolidColumnDef<GridRow>[]>([]);
	const [rows, setRows] = createSignal<GridRow[]>([]);
	let containerRef!: HTMLDivElement;

	let tableApi: TableAPI<GridRow> | undefined;

	const emitChange = () => {
		const serialized: SerializedTable = {
			columns: columns().map((c) => ({
				accessor: c.accessor,
				label: c.label ?? "",
				width: Number(c.width) || 200,
			})),
			rows: rows(),
		};
		props.onChangeContent?.(JSON.stringify(serialized));
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
			const insertIndex = isShift ? index : index + 1; // Shift = above, Click = below

			const updated = [...current];
			updated.splice(insertIndex, 0, newRow);
			return updated;
		});
		emitChange();
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
			comparator: makeEmptyLastComparator(),
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
		emitChange();
	};

	const handleCellEdit = ({ accessor, newValue, row }: CellChangeProps) => {
		if (accessor === ADD_COL_ACCESSOR) return;

		setRows((current) => {
			const index = current.findIndex((r) => r.id === row.id);
			if (index === -1) return current;

			const next = [...current];
			next[index] = { ...next[index], [accessor]: newValue };

			if (tableApi) {
				tableApi.updateData({ rowIndex: index, accessor, newValue });
			}

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

	const buildColumns = (
		saved: SerializedColumn[],
		onHeaderEdit: (
			header: ColumnDef<GridRow, CellValue>,
			newLabel: string,
		) => void,
	): SolidColumnDef<GridRow>[] =>
		saved.map((col) => ({
			accessor: col.accessor,
			label: col.label,
			width: col.width,
			sortable: true,
			editable: true,
			comparator: makeEmptyLastComparator(),
			headerRenderer: (props: {
				header: ColumnDef<GridRow, CellValue>;
				components?: HeaderRendererComponents;
			}) => (
				<EditableHeader
					header={props.header}
					components={props.components}
					onHeaderEdit={onHeaderEdit}
				/>
			),
		}));

	const finalColumns = createMemo(() => {
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
			cellRenderer: () => null,
		};

		return [...columns(), addColumnDef];
	});

	onMount(() => {
		if (columns().length > 0) return;

		const parsed = parseTableContent(props.content ?? "");
		if (parsed) {
			setColumns(buildColumns(parsed.columns, handleHeaderEdit));
			setRows(parsed.rows);
		} else {
			setColumns(INITIAL_COLUMNS(handleHeaderEdit));
			setRows(INITIAL_ROWS);
		}
	});

	return (
		<div ref={containerRef} class={tablePage}>
			<SimpleTable
				ref={(api) => (tableApi = api)}
				columns={finalColumns()}
				rows={rows()}
				rowsPerPage={8}
				customTheme={{
					rowHeight: 38,
					headerHeight: 45,
				}}
				rowButtons={[
					({ row }) => (
						<div class={floatingAddRowBtn}>
							<wa-button
								size="s"
								appearance="plain"
								onClick={(e: MouseEvent) => {
									e.stopPropagation();
									addRow(row.id, e);
								}}
							>
								<wa-icon name="plus" label="Add row"></wa-icon>
							</wa-button>
						</div>
					),
				]}
				columnReordering
				columnResizing
				enableRowSelection
				getRowId={({ row }) => row.id}
				onCellEdit={handleCellEdit}
				theme={theme()}
				icons={TABLE_ICONS}
				scrollParent={() => document.querySelector("wa-page")}
			/>

			<wa-button
				type="button"
				variant="neutral"
				appearance="plain"
				size="s"
				onClick={(e: MouseEvent) => addRow(undefined, e)}
				style={{
					width: "fit-content",
					"margin-top": "8px",
					background: "var(--wa-color-surface-default)",
				}}
			>
				<wa-icon slot="start" name="plus"></wa-icon>
				Add row
			</wa-button>
		</div>
	);
};

export default TablePage;
