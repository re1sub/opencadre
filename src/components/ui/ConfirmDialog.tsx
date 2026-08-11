import { onCleanup, onMount } from "solid-js";
import { confirmActions, confirmMessage } from "./confirmDialog.css";
import { DeleteButton } from "./DeleteButton";

interface ConfirmDialogProps {
	label: string;
	message: string;
	onConfirm: () => void;
	onClose: () => void;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
	let dialogRef: { open: boolean } | undefined;

	onMount(() => {
		const frame = requestAnimationFrame(() => {
			if (dialogRef) dialogRef.open = true;
		});
		onCleanup(() => cancelAnimationFrame(frame));
	});

	const handleConfirm = () => {
		props.onConfirm();
		close();
	};

	const close = () => {
		if (dialogRef) dialogRef.open = false;
	};

	return (
		<wa-dialog
			ref={(el) => (dialogRef = el)}
			light-dismiss
			label={props.label}
			on:wa-after-hide={() => props.onClose()}
		>
			<p class={confirmMessage}>{props.message}</p>

			<div class={confirmActions}>
				<wa-button variant="neutral" onClick={close}>
					Cancel
				</wa-button>
				<DeleteButton onDelete={handleConfirm} />
			</div>
		</wa-dialog>
	);
}
