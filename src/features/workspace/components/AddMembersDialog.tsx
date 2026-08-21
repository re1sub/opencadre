import { useAuth } from "#/features/auth/AuthContext";
import { useDialog } from "#/utils/useDialog";
import { dialogActions, dialogBody, memberRow } from "./workspace.css";

interface AddMembersDialogProps {
	onClose: () => void;
}

const AddMembersDialog = (props: AddMembersDialogProps) => {
	const dialog = useDialog(props.onClose);
	const { user } = useAuth();

	return (
		<wa-dialog
			ref={dialog.ref}
			light-dismiss
			label="Add members"
			on:wa-after-hide={dialog.handleHide}
		>
			<div class={dialogBody}>
				<div
					style={{
						display: "flex",
						"align-items": "flex-end",
						width: "80%",
						gap: "var(--wa-space-xs)",
					}}
				>
					<wa-input
						label="Email address"
						placeholder="member@example.com"
						style={{ width: "100%" }}
					></wa-input>
					<wa-button type="button" variant="brand">
						<wa-icon name="send-horizontal" label="Send invite"></wa-icon>
					</wa-button>
				</div>
				<p style={{ color: "var(--wa-color-text-quiet)", margin: 0 }}>
					Members
				</p>

				<div class={memberRow}>
					<wa-avatar
						initials={(user()?.email ?? "?").slice(0, 2).toUpperCase()}
						label={user()?.email ?? ""}
						style={{ "--size": "2rem" }}
					></wa-avatar>
					<span style={{ color: "var(--wa-color-text-normal)" }}>
						{user()?.email ?? "You"}
					</span>
				</div>
			</div>

			<div class={dialogActions} slot="footer">
				<wa-button variant="neutral" onClick={dialog.close}>
					Cancel
				</wa-button>
			</div>
		</wa-dialog>
	);
};

export default AddMembersDialog;
