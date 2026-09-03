import { createSignal } from "solid-js";
import { useDialog } from "#/utils/useDialog";
import { confirmActions, confirmMessage } from "./confirmDialog.css";
import DeleteButton from "./DeleteButton";

interface ConfirmDialogProps {
	label: string;
	message: string;
	confirmText?: string;
	onConfirm: () => void;
	onClose: () => void;
}

const ConfirmDialog = (props: ConfirmDialogProps) => {
	const dialog = useDialog(props.onClose);
	const [inputValue, setInputValue] = createSignal("");

	const isDisabled = () =>
		props.confirmText !== undefined && inputValue() !== props.confirmText;

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

			{props.confirmText !== undefined && (
				<wa-input
					type="text"
					placeholder={props.confirmText}
					value={inputValue()}
					onInput={(e: Event) =>
						setInputValue((e.currentTarget as HTMLInputElement).value)
					}
				>
					<span slot="label">
						Type <em>{props.confirmText}</em> to confirm
					</span>
				</wa-input>
			)}

			<div class={confirmActions}>
				<wa-button variant="neutral" onClick={dialog.close}>
					Cancel
				</wa-button>
				<DeleteButton onDelete={handleConfirm} disabled={isDisabled()} />
			</div>
		</wa-dialog>
	);
};

export default ConfirmDialog;
