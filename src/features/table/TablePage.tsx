import type {
	CellValue,
	ColumnDef,
	RowSelectionChangeProps,
	SolidColumnDef,
	TableAPI,
} from "@simple-table/solid";
import { SimpleTable } from "@simple-table/solid";
import {
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	Show,
} from "solid-js";
import "@simple-table/solid/styles.css";
import * as Y from "yjs";
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
import { useDebouncedPush } from "#/utils/realtime/useDebouncedPush";
import type { YjsUpdateOrigin } from "#/utils/yjs/types";
import { useYjsDoc } from "#/utils/yjs/useYjsDoc";
import { initTableDoc, mutateTableDoc, parseTableDoc } from "./hooks/tableYjs";

const ADD_COL_ACCESSOR = "__add_column__";

interface TablePageProps {
	pageId?: string;
	workspaceId?: string;
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

	const yjs = useYjsDoc({
		entityType: () => "table",
		entityId: () => props.pageId ?? "",
		workspaceId: () => props.workspaceId ?? "",
	});

	const { setPush, push } = useDebouncedPush(400);

	let lastValue = props.content ?? "";
	const [pendingAction, setPendingAction] = createSignal<{
		label: string;
		message: string;
		onConfirm: () => void;
	} | null>(null);

	let containerRef!: HTMLDivElement;
	let fileInputRef!: HTMLInputElement;

	let tableApi: TableAPI<GridRow> | undefined;

	createEffect(() => {
		setPush(() => {
			const serialized: SerializedTable = {
				columns: columns().map((c) => ({
					accessor: c.accessor as string,
					label: c.label ?? "",
					width: Number(c.width) || 200,
				})),
				rows: rows(),
			};
			lastValue = JSON.stringify(serialized);
			props.onChangeContent?.(lastValue);
		});
	});

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
		yjs.doc,
		setSelectedRows,
		() => tableApi,
	);

	const csv = useCsv(yjs.doc);

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
		const doc = yjs.doc();
		if (!doc) return;
		const nextColumnNumber = columns().length + 1;
		const accessor = `col_${nextColumnNumber}`;

		mutateTableDoc(doc, ({ colOrder, colsMap, rowOrder, rowsMap }) => {
			const cMap = new Y.Map<string | number>();
			cMap.set("accessor", accessor);
			cMap.set("label", `Column ${nextColumnNumber}`);
			cMap.set("width", 200);
			colsMap.set(accessor, cMap);
			colOrder.insert(colOrder.length, [accessor]);

			for (const rId of rowOrder) {
				const rMap = rowsMap.get(rId);
				if (rMap) rMap.set(accessor, "");
			}
		});
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

	createEffect(() => {
		const ydoc = yjs.doc();
		if (!ydoc || !yjs.loaded()) return;

		const syncLocal = () => {
			const parsed = parseTableDoc(ydoc);
			setColumns(buildColumns(parsed.columns));
			setRows(parsed.rows);
		};

		const updateHandler = (_update: Uint8Array, origin: YjsUpdateOrigin) => {
			syncLocal();
			if (origin !== "supabase-load" && origin !== "supabase-broadcast") {
				push();
			}
		};
		ydoc.on("update", updateHandler);

		if (yjs.isNew()) {
			const parsed = parseTableContent(props.content ?? "");
			if (parsed) {
				initTableDoc(ydoc, parsed);
			} else {
				const initCols: SerializedColumn[] = [];
				INITIAL_COLUMNS(
					() => {},
					() => {},
					() => {},
				).forEach((c) => {
					initCols.push({
						accessor: c.accessor as string,
						label: c.label || "",
						width: typeof c.width === "number" ? c.width : 200,
					});
				});
				initTableDoc(ydoc, { columns: initCols, rows: INITIAL_ROWS });
			}
		}

		syncLocal();

		onCleanup(() => {
			ydoc.off("update", updateHandler);
		});
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
				onColumnOrderChange={(newCols) => {
					const doc = yjs.doc();
					if (!doc) return;

					mutateTableDoc(doc, ({ colOrder }) => {
						colOrder.delete(0, colOrder.length);
						colOrder.insert(
							0,
							newCols.map((c) => c.accessor as string),
						);
					});
				}}
				columnResizing
				onColumnWidthChange={(headers) => {
					const doc = yjs.doc();
					if (!doc) return;
					mutateTableDoc(doc, ({ colsMap }) => {
						for (const h of headers) {
							const cMap = colsMap.get(h.accessor as string);
							if (cMap) cMap.set("width", Number(h.width) || 200);
						}
					});
				}}
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
