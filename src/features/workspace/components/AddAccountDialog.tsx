import { useDialog } from "#/utils/useDialog";
import { dialogActions, dialogBody, dialogLabel } from "./workspace.css";

interface AddAccountDialogProps {
	onClose: () => void;
}

const AddAccountDialog = (props: AddAccountDialogProps) => {
	const dialog = useDialog(props.onClose);

	return (
		<wa-dialog
			ref={dialog.ref}
			light-dismiss
			label="Add account"
			on:wa-after-hide={dialog.handleHide}
		>
			<div class={dialogBody}>
				<p class={dialogLabel}>
					Sign in to another account on this device. You can switch between
					accounts without signing out of your current one.
				</p>
				<wa-input
					label="Email address"
					placeholder="you@example.com"
				></wa-input>
			</div>

			<div class={dialogActions} slot="footer">
				<wa-button variant="neutral" onClick={dialog.close}>
					Cancel
				</wa-button>

				<wa-button
					type="button"
					variant="brand"
					style={{ "align-self": "flex-end" }}
				>
					<wa-icon slot="start" name="user-plus" label="Add account"></wa-icon>
					Add account
				</wa-button>
			</div>
		</wa-dialog>
	);
};

export default AddAccountDialog;
