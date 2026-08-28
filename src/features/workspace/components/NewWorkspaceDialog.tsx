import { useDialog } from "#/utils/useDialog";
import CreateWorkspace from "./CreateWorkspace";

interface NewWorkspaceDialogProps {
	onCreate: (name: string) => Promise<void>;
	onClose: () => void;
}

const NewWorkspaceDialog = (props: NewWorkspaceDialogProps) => {
	const dialog = useDialog(props.onClose);

	return (
		<wa-dialog
			ref={dialog.ref}
			light-dismiss
			on:wa-after-hide={dialog.handleHide}
		>
			<CreateWorkspace
				mode="new"
				onCreate={props.onCreate}
				onCancel={dialog.close}
			/>
		</wa-dialog>
	);
};

export default NewWorkspaceDialog;
