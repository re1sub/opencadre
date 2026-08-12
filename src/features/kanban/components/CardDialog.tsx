import { createSignal, onCleanup, onMount } from "solid-js";
import DeleteButton from "#/features/ui/DeleteButton";
import type { Card } from "../types";
import * as styles from "./board.css";

interface CardDialogProps {
	card: Card;
	onClose: () => void;
	onSave: (card: Card) => void;
	onRequestDelete: () => void;
}

const CardDialog = (props: CardDialogProps) => {
	let dialogRef: { open: boolean } | undefined;

	const [title, setTitle] = createSignal(props.card.title);
	const [description, setDescription] = createSignal(props.card.description);
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
			...props.card,
			title: title(),
			description: description(),
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
			label="Card details"
			on:wa-after-hide={handleHide}
		>
			<div class={styles.dialogBody}>
				<wa-input
					label="Title"
					attr:value={props.card.title}
					on:input={(event) =>
						setTitle((event.currentTarget as HTMLInputElement).value)
					}
				></wa-input>

				<wa-textarea
					label="Description"
					rows={4}
					attr:value={props.card.description}
					on:input={(event) =>
						setDescription((event.currentTarget as HTMLTextAreaElement).value)
					}
				></wa-textarea>
			</div>

			<div class={styles.dialogActions}>
				<DeleteButton onDelete={handleDelete} label="Delete card" />

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
};

export default CardDialog;
