import { useDialog } from "#/utils/useDialog";
import { confirmActions, confirmMessage } from "./confirmDialog.css";
import DeleteButton from "./DeleteButton";

interface ConfirmDialogProps {
	label: string;
	message: string;
	onConfirm: () => void;
	onClose: () => void;
}

const ConfirmDialog = (props: ConfirmDialogProps) => {
	const dialog = useDialog(props.onClose);

	const handleConfirm = () => {
		props.onConfirm();
		dialog.close();
	};

	return (
		<wa-dialog
			ref={dialog.ref}
			light-dismiss
			label={props.label}
			on:wa-after-hide={dialog.handleHide}
		>
			<p class={confirmMessage}>{props.message}</p>

			<div class={confirmActions}>
				<wa-button variant="neutral" onClick={dialog.close}>
					Cancel
				</wa-button>
				<DeleteButton onDelete={handleConfirm} />
			</div>
		</wa-dialog>
	);
};

export default ConfirmDialog;
