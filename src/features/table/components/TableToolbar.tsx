import { tablePageHeader } from "../tablePage.css";

interface TableToolbarProps {
	selectedRowsSize: number;
	setBulkDeleteOpen: (open: boolean) => void;
	triggerImport: () => void;
	exportCsv: () => void;
}

export const TableToolbar = (props: TableToolbarProps) => (
	<div class={tablePageHeader}>
		{props.selectedRowsSize > 0 && (
			<wa-button
				type="button"
				variant="danger"
				appearance="outlined"
				size="s"
				onClick={() => props.setBulkDeleteOpen(true)}
			>
				<wa-icon slot="start" name="trash-2"></wa-icon>
				Delete selected ({props.selectedRowsSize})
			</wa-button>
		)}
		<wa-button
			type="button"
			variant="neutral"
			appearance="outlined"
			size="s"
			onClick={props.triggerImport}
		>
			<wa-icon slot="start" name="upload"></wa-icon>
			Import
		</wa-button>
		<wa-button
			type="button"
			variant="neutral"
			appearance="outlined"
			size="s"
			onClick={props.exportCsv}
		>
			<wa-icon slot="start" name="download"></wa-icon>
			Export
		</wa-button>
	</div>
);
