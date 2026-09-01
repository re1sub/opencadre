import { floatingAddRowBtn } from "../tablePage.css";
import type { GridRow } from "../types";

interface RowActionsProps {
	row: GridRow;
	addRow: (id: string, e: MouseEvent) => void;
	setRowToDelete: (row: GridRow) => void;
}

export const RowActions = (props: RowActionsProps) => (
	<div class={floatingAddRowBtn}>
		<wa-button
			size="s"
			appearance="plain"
			onClick={(e: MouseEvent) => {
				e.stopPropagation();
				props.addRow(props.row.id, e);
			}}
		>
			<wa-icon name="plus" label="Add row"></wa-icon>
		</wa-button>
		<wa-button
			size="s"
			variant="danger"
			appearance="plain"
			onClick={(e: MouseEvent) => {
				e.stopPropagation();
				props.setRowToDelete(props.row);
			}}
		>
			<wa-icon name="trash-2" label="Delete row"></wa-icon>
		</wa-button>
	</div>
);
