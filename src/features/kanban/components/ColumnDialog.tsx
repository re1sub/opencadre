import { createSignal } from "solid-js";
import DeleteButton from "#/features/ui/DeleteButton";
import { useDialog } from "#/utils/useDialog";
import type { Column } from "../types";
import * as styles from "./board.css";

interface ColumnDialogProps {
	column: Column;
	onClose: () => void;
	onSave: (column: Column) => void;
	onRequestDelete: () => void;
}

const ColumnDialog = (props: ColumnDialogProps) => {
	const dialog = useDialog(props.onClose, props.onRequestDelete);

	const [title, setTitle] = createSignal(props.column.title);
	const [color, setColor] = createSignal(props.column.color);

	const handleSave = () => {
		props.onSave({
			...props.column,
			title: title(),
			color: color(),
		});
		dialog.close();
	};

	return (
		<wa-dialog
			ref={dialog.ref}
			light-dismiss
			label="Column settings"
			on:wa-after-hide={dialog.handleHide}
		>
			<div slot="header-actions">
				<DeleteButton
					onDelete={dialog.handleDelete}
					label="Delete card"
					iconOnly
				/>
			</div>
			<div class={styles.dialogBody}>
				<wa-input
					label="Column name"
					value={props.column.title}
					onInput={(e) => setTitle((e.currentTarget as HTMLInputElement).value)}
				></wa-input>

				<div class={styles.dialogRow}>
					<span class={styles.dialogLabel}>Accent color</span>
					<div
						style={{
							display: "flex",
							"align-items": "center",
							gap: "var(--wa-space-s)",
						}}
					>
						<wa-color-picker
							value={props.column.color}
							onInput={(e) =>
								setColor(
									(e.currentTarget as unknown as { value: string }).value,
								)
							}
						></wa-color-picker>
					</div>
				</div>
			</div>

			<div slot="footer">
				<div style={{ display: "flex", gap: "var(--wa-space-s)" }}>
					<wa-button variant="neutral" onClick={dialog.close}>
						Cancel
					</wa-button>
					<wa-button variant="brand" onClick={handleSave}>
						Save
					</wa-button>
				</div>
			</div>
		</wa-dialog>
	);
};

export default ColumnDialog;
