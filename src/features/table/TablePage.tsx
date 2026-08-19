import type {
	CellChangeProps,
	CellValue,
	ColumnDef,
	SolidColumnDef,
	SortColumn,
} from "@simple-table/solid";
import { SimpleTable } from "@simple-table/solid";
import {
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	onMount,
} from "solid-js";
import "@simple-table/solid/styles.css";
import { useTheme } from "#/theme/ThemeProvider";
import EditableHeader from "./components/EditableHeader";
import { TABLE_ICONS } from "./constants/constants";
import { tablePage } from "./tablePage.css";

type GridRow = { id: string } & Record<string, CellValue>;

const ADD_COL_ACCESSOR = "__add_column__";
const ADD_ROW_ID = "__add_row__";

const TablePage = () => {
	const { theme } = useTheme();
	const [columns, setColumns] = createSignal<SolidColumnDef<GridRow>[]>([]);
	const [rows, setRows] = createSignal<GridRow[]>([]);
	let containerRef!: HTMLDivElement;

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
			cellRenderer: () => null,
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
									style={{
										width: "100%",
										"pointer-events": "auto",
										background: "var(--wa-color-surface-default)",
									}}
								>
									<wa-icon slot="start" name="plus"></wa-icon>
									Add row
								</wa-button>
							);
						}
						return null;
					}

					if (col.cellRenderer) {
						return col.cellRenderer(props);
					}

					if (props.value == null) return null;
					if (typeof props.value === "object")
						return JSON.stringify(props.value);
					return String(props.value);
				},
			}),
		);
	});

	const handleSortChange = (sort: SortColumn | null) => {
		if (!sort?.direction) return;

		const accessor = sort.key.accessor;
		const direction = sort.direction;

		setRows((current) => {
			const dataRows = current.filter((row) => row.id !== ADD_ROW_ID);

			const sortedRows = [...dataRows].sort((a, b) => {
				const valA = a[accessor] ?? "";
				const valB = b[accessor] ?? "";

				const comparison = String(valA).localeCompare(String(valB), undefined, {
					numeric: true,
					sensitivity: "base",
				});

				return direction === "asc" ? comparison : -comparison;
			});

			return sortedRows;
		});
	};

	createEffect(() => {
		gridRows(); // Track rows signal change
		if (!containerRef) return;

		requestAnimationFrame(() => {
			const bodyMain = containerRef.querySelector(
				".st-body-main",
			) as HTMLElement | null;
			if (!bodyMain) return;

			const cells = bodyMain.querySelectorAll(".st-cell");
			let maxBottom = 0;

			cells.forEach((cell) => {
				const cellEl = cell as HTMLElement;
				const top = parseInt(cellEl.style.top || "0", 10);
				const height = parseInt(cellEl.style.height || "38", 10);
				if (top + height > maxBottom) maxBottom = top + height;
			});

			if (maxBottom > 0) {
				bodyMain.style.height = `${maxBottom}px`;
			}
		});
	});

	onMount(() => {
		if (columns().length === 0) {
			addColumn();
			for (let i = 1; i < 4; i++) {
				addRow();
			}
		}

		const handleScroll = () => {
			if (!containerRef) return;

			const headerContainer = containerRef.querySelector(
				".st-header-container",
			) as HTMLElement | null;
			const tableContent = containerRef.querySelector(
				".st-content",
			) as HTMLElement | null;
			const navEl = document.querySelector(
				'nav[slot="main-header"]',
			) as HTMLElement | null;

			if (!headerContainer || !tableContent) return;

			const navbarOffset = navEl ? navEl.offsetHeight : 0;
			const originalTop =
				tableContent.getBoundingClientRect().top + window.scrollY;
			const scrollY = window.scrollY;
			const rect = tableContent.getBoundingClientRect();

			if (scrollY + navbarOffset >= originalTop && rect.bottom > 60) {
				headerContainer.style.position = "fixed";
				headerContainer.style.top = `${navbarOffset}px`;
				headerContainer.style.left = `${rect.left}px`;
				headerContainer.style.width = `${rect.width}px`;
				headerContainer.style.zIndex = "1000";
			} else {
				headerContainer.style.position = "relative";
				headerContainer.style.top = "0px";
				headerContainer.style.left = "auto";
			}
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		window.addEventListener("resize", handleScroll, { passive: true });

		onCleanup(() => {
			window.removeEventListener("scroll", handleScroll);
			window.removeEventListener("resize", handleScroll);
		});
	});

	return (
		<div ref={containerRef} class={tablePage}>
			<SimpleTable
				columns={finalColumns()}
				rows={gridRows()}
				rowsPerPage={8}
				customTheme={{
					rowHeight: 38,
				}}
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
};

export default TablePage;
