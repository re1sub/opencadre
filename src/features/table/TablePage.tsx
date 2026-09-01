import type {
	CellValue,
	ColumnDef,
	RowSelectionChangeProps,
	SolidColumnDef,
	TableAPI,
} from "@simple-table/solid";
import { SimpleTable } from "@simple-table/solid";
import { createMemo, createSignal, onMount, Show } from "solid-js";
import "@simple-table/solid/styles.css";
import EditableHeader from "#/features/table/components/EditableHeader";
import { RowActions } from "#/features/table/components/RowActions";
import { TableToolbar } from "#/features/table/components/TableToolbar";
import { TABLE_ICONS } from "#/features/table/constants/constants";
import { INITIAL_COLUMNS, INITIAL_ROWS } from "#/features/table/constants/data";
import { useCsv } from "#/features/table/hooks/useCsv";
import { useTableActions } from "#/features/table/hooks/useTableActions";
import { tablePage } from "#/features/table/tablePage.css";
import type {
	GridRow,
	SerializedColumn,
	SerializedTable,
} from "#/features/table/types";
import ConfirmDialog from "#/features/ui/ConfirmDialog";
import { useTheme } from "#/theme/ThemeProvider";

const ADD_COL_ACCESSOR = "__add_column__";

interface TablePageProps {
	content?: string;
	onChangeContent?: (content: string) => void;
	title?: string;
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

const TablePage = (props: TablePageProps) => {
	const { theme } = useTheme();
	const [columns, setColumns] = createSignal<SolidColumnDef<GridRow>[]>([]);
	const [rows, setRows] = createSignal<GridRow[]>([]);
	const [selectedRows, setSelectedRows] = createSignal<Set<string>>(new Set());
	const [pendingAction, setPendingAction] = createSignal<{
		label: string;
		message: string;
		onConfirm: () => void;
	} | null>(null);

	let containerRef!: HTMLDivElement;
	let fileInputRef!: HTMLInputElement;

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

	const makeColumnDef = (
		accessor: string,
		label: string,
		width = 200,
	): SolidColumnDef<GridRow> => ({
		accessor,
		label,
		width,
		sortable: false,
		editable: true,
		headerRenderer: (props) => (
			<EditableHeader
				header={props.header}
				components={props.components}
				onHeaderEdit={actions.handleHeaderEdit}
				onColumnDelete={handleColumnDelete}
				onColumnDuplicate={actions.handleColumnDuplicate}
			/>
		),
	});

	const actions = useTableActions(
		columns,
		rows,
		setColumns,
		setRows,
		setSelectedRows,
		emitChange,
		makeColumnDef,
		() => tableApi,
	);
	const csv = useCsv(
		columns,
		rows,
		setColumns,
		setRows,
		makeColumnDef,
		emitChange,
		props.title,
		() => tableApi,
	);

	const exportCsv = () => {
		tableApi?.exportToCSV({
			filename: `${(props.title ?? "table")
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-+|-+$/g, "")}.csv`,
		});
	};

	const handleColumnDelete = (header: ColumnDef<GridRow, CellValue>) => {
		const col = columns().find((c) => c.accessor === header.accessor);
		if (!col) return;
		setPendingAction({
			label: "Delete column",
			message: `Delete column "${col.label ?? col.accessor}"? Its values are removed from every row.`,
			onConfirm: () => actions.deleteColumnDef(col),
		});
	};

	const addColumn = () => {
		const nextColumnNumber = columns().length + 1;
		const accessor = `col_${nextColumnNumber}`;

		setColumns((current) => [
			...current,
			makeColumnDef(accessor, `Column ${nextColumnNumber}`),
		]);
		setRows((current) => current.map((row) => ({ ...row, [accessor]: "" })));
		emitChange();
	};

	const buildColumns = (saved: SerializedColumn[]): SolidColumnDef<GridRow>[] =>
		saved.map((col) => makeColumnDef(col.accessor, col.label, col.width));

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
			setColumns(buildColumns(parsed.columns));
			setRows(parsed.rows);
		} else {
			setColumns(
				INITIAL_COLUMNS(
					actions.handleHeaderEdit,
					handleColumnDelete,
					actions.handleColumnDuplicate,
				),
			);
			setRows(INITIAL_ROWS);
		}
	});

	return (
		<div ref={containerRef} class={tablePage}>
			<TableToolbar
				selectedRowsSize={selectedRows().size}
				setBulkDeleteOpen={() =>
					setPendingAction({
						label: "Delete rows",
						message: `Delete ${selectedRows().size} selected ${selectedRows().size === 1 ? "row" : "rows"}? This cannot be undone.`,
						onConfirm: () => actions.deleteRows(selectedRows()),
					})
				}
				triggerImport={() => fileInputRef?.click()}
				exportCsv={exportCsv}
			/>

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
						<RowActions
							row={row}
							addRow={actions.addRow}
							setRowToDelete={(row) =>
								setPendingAction({
									label: "Delete row",
									message: "Delete this row? This cannot be undone.",
									onConfirm: () => actions.deleteRows([row.id]),
								})
							}
						/>
					),
				]}
				columnReordering
				columnResizing
				enableRowSelection
				getRowId={({ row }) => String(row.id)}
				onCellEdit={actions.handleCellEdit}
				onRowSelectionChange={(props: RowSelectionChangeProps<GridRow>) => {
					const extractedIds = new Set<string>();
					if (props?.selectedRows) {
						const values =
							props.selectedRows instanceof Set ||
							Array.isArray(props.selectedRows)
								? Array.from(props.selectedRows)
								: [props.selectedRows];
						values.forEach((item: string) => {
							const cleanId = item.replace(/^\d+-/, "");
							extractedIds.add(cleanId);
						});
					}
					setSelectedRows(extractedIds);
				}}
				theme={theme()}
				icons={TABLE_ICONS}
				scrollParent={() => document.querySelector("wa-page")}
			/>

			<wa-button
				type="button"
				variant="neutral"
				appearance="plain"
				size="s"
				onClick={(e: MouseEvent) => actions.addRow(undefined, e)}
				style={{
					width: "fit-content",
					"margin-top": "8px",
					background: "var(--wa-color-surface-default)",
				}}
			>
				<wa-icon slot="start" name="plus"></wa-icon>
				Add row
			</wa-button>

			<input
				ref={fileInputRef}
				type="file"
				accept=".csv,text/csv"
				style={{ display: "none" }}
				onChange={(e) => {
					const input = e.currentTarget;
					const file = input.files?.[0];
					if (file) {
						const reader = new FileReader();
						reader.onload = () => {
							const text =
								typeof reader.result === "string" ? reader.result : "";
							if (text.trim()) csv.importCsv(text);
							input.value = "";
						};
						reader.readAsText(file);
					}
				}}
			/>

			<Show when={pendingAction()}>
				{(action) => (
					<ConfirmDialog
						label={action().label}
						message={action().message}
						onConfirm={() => {
							action().onConfirm();
							setPendingAction(null);
						}}
						onClose={() => setPendingAction(null)}
					/>
				)}
			</Show>
		</div>
	);
};

export default TablePage;
