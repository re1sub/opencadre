import { createSignal, onCleanup, onMount } from "solid-js";
import { DeleteButton } from "#/features/ui/DeleteButton";
import type { Column } from "../types";
import * as styles from "./board.css";

interface ColumnDialogProps {
	column: Column;
	onClose: () => void;
	onSave: (column: Column) => void;
	onRequestDelete: () => void;
}

export function ColumnDialog(props: ColumnDialogProps) {
	let dialogRef: { open: boolean } | undefined;

	const [title, setTitle] = createSignal(props.column.title);
	const [color, setColor] = createSignal(props.column.color);
	const [pendingDelete, setPendingDelete] = createSignal(false);

	onMount(() => {
		const frame = requestAnimationFrame(() => {
			if (dialogRef) dialogRef.open = true;
		});
		onCleanup(() => cancelAnimationFrame(frame));
	});

	const handleHide = () => {
		if (pendingDelete()) {
			props.onRequestDelete();
		} else {
			props.onClose();
		}
	};

	const close = () => {
		if (dialogRef) dialogRef.open = false;
	};

	const handleSave = () => {
		props.onSave({
			...props.column,
			title: title(),
			color: color(),
		});
		close();
	};

	const handleDelete = () => {
		setPendingDelete(true);
		close();
	};

	return (
		<wa-dialog
			ref={(el) => (dialogRef = el)}
			light-dismiss
			label="Column settings"
			on:wa-after-hide={handleHide}
		>
			<div class={styles.dialogBody}>
				<wa-input
					label="Column name"
					attr:value={props.column.title}
					on:input={(event) =>
						setTitle((event.currentTarget as HTMLInputElement).value)
					}
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
							attr:value={props.column.color}
							on:input={(event) =>
								setColor(
									(event.currentTarget as unknown as { value: string }).value,
								)
							}
						></wa-color-picker>
					</div>
				</div>
			</div>

			<div class={styles.dialogActions}>
				<DeleteButton onDelete={handleDelete} label="Delete column" />

				<div style={{ display: "flex", gap: "var(--wa-space-s)" }}>
					<wa-button variant="neutral" onClick={close}>
						Cancel
					</wa-button>
					<wa-button variant="brand" onClick={handleSave}>
						Save
					</wa-button>
				</div>
			</div>
		</wa-dialog>
	);
}
