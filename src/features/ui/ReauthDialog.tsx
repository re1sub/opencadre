import { createSignal, Show } from "solid-js";
import { useAuth } from "#/features/auth/AuthContext";
import { getErrorMessage } from "#/utils/misc";
import { supabase } from "#/utils/supabase";
import { useDialog } from "#/utils/useDialog";
import { confirmActions, confirmMessage } from "./confirmDialog.css";

interface ReauthDialogProps {
	label: string;
	message: string;
	onAuthenticated: () => Promise<void> | void;
	onClose: () => void;
}

const ReauthDialog = (props: ReauthDialogProps) => {
	const dialog = useDialog(props.onClose);
	const { user } = useAuth();
	const [password, setPassword] = createSignal("");
	const [error, setError] = createSignal<string | null>(null);
	const [busy, setBusy] = createSignal(false);

	const handleConfirm = async () => {
		const email = user()?.email;
		if (!email || busy()) return;

		setBusy(true);
		setError(null);
		const { error: authError } = await supabase.auth.signInWithPassword({
			email,
			password: password(),
		});
		setPassword("");

		if (authError) {
			setError(getErrorMessage(authError, "Could not verify your password."));
			setBusy(false);
			return;
		}

		try {
			await props.onAuthenticated();
			dialog.close();
		} catch (err) {
			setError(getErrorMessage(err, "Could not complete this action."));
		} finally {
			setBusy(false);
		}
	};

	return (
		<wa-dialog
			ref={dialog.ref}
			light-dismiss
			label={props.label}
			on:wa-after-hide={dialog.handleHide}
		>
			<p class={confirmMessage}>{props.message}</p>
			<wa-input
				label="Current password"
				type="password"
				autocomplete="current-password"
				value={password()}
				disabled={busy()}
				onInput={(e: Event) =>
					setPassword((e.currentTarget as HTMLInputElement).value)
				}
				onKeyDown={(e: KeyboardEvent) => {
					if (e.key === "Enter") void handleConfirm();
				}}
			></wa-input>
			<Show when={error()}>
				<p
					class={confirmMessage}
					style={{ color: "var(--wa-color-danger-text)" }}
				>
					{error()}
				</p>
			</Show>
			<div class={confirmActions}>
				<wa-button variant="neutral" onClick={dialog.close} disabled={busy()}>
					Cancel
				</wa-button>
				<wa-button variant="brand" onClick={handleConfirm} disabled={busy()}>
					Confirm password
				</wa-button>
			</div>
		</wa-dialog>
	);
};

export default ReauthDialog;
