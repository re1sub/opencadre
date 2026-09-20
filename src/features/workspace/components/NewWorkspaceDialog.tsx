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
			label="Create Workspace"
			on:wa-after-hide={dialog.handleHide}
		>
			<h2
				style={{ "font-size": "1.5rem", "margin-bottom": "var(--wa-space-s)" }}
			>
				Create a new workspace
			</h2>
			<p
				style={{
					"font-size": "0.875rem",
					color: "var(--wa-color-text-quiet)",
					"margin-bottom": "var(--wa-space-m)",
				}}
			>
				Workspaces group your pages, boards, and tables together.
			</p>
			<CreateWorkspace
				mode="new"
				onCreate={props.onCreate}
				onCancel={dialog.close}
			/>
		</wa-dialog>
	);
};

export default NewWorkspaceDialog;
