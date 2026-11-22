import { createSignal, For, Show } from "solid-js";
import { getErrorMessage } from "#/utils/misc";
import {
	actions,
	detail,
	errorText,
	heading,
	meta,
	row,
} from "./deviceLinkApproval.css";
import { useVault } from "./VaultProvider";

const DeviceLinkApproval = () => {
	const vault = useVault();
	const [busyId, setBusyId] = createSignal<string | null>(null);
	const [message, setMessage] = createSignal<string | null>(null);

	const pendingLinks = () =>
		vault.deviceLinks().filter((link) => {
			if (link.status !== "pending") return false;
			if (new Date(link.expires_at) <= new Date()) return false;
			// Legacy requests with no target remain broadcast.
			if (!link.target_device_id) return true;
			return link.target_device_id === vault.deviceId();
		});

	const setDialogRef = (el: { open: boolean } | undefined) => {
		if (el) el.open = true;
	};

	const respond = async (requestId: string, action: "approve" | "reject") => {
		setMessage(null);
		setBusyId(requestId);
		try {
			if (action === "approve") await vault.approveLink(requestId);
			else await vault.rejectLink(requestId);
		} catch (err) {
			setMessage(getErrorMessage(err, `Could not ${action} the device link.`));
		} finally {
			setBusyId(null);
		}
	};

	return (
		<Show when={pendingLinks().length > 0}>
			<wa-dialog
				ref={setDialogRef}
				label="Confirm it's you"
				on:wa-hide={(event: Event) => {
					if (pendingLinks().length > 0) event.preventDefault();
				}}
			>
				<For each={pendingLinks()}>
					{(link) => (
						<div class={row}>
							<div class={meta}>
								<p class={heading}>Confirm it's you</p>
								<p class={detail}>
									A device is asking to unlock your encrypted account as "
									{link.device_label}". Only approve if you started this.
								</p>
							</div>
							<div class={actions}>
								<wa-button
									variant="brand"
									appearance="outlined"
									disabled={busyId() === link.id}
									onClick={() => void respond(link.id, "approve")}
								>
									Approve
								</wa-button>
								<wa-button
									variant="neutral"
									appearance="plain"
									disabled={busyId() === link.id}
									onClick={() => void respond(link.id, "reject")}
								>
									Reject
								</wa-button>
							</div>
						</div>
					)}
				</For>
				<Show when={message()}>
					<p class={errorText}>{message()}</p>
				</Show>
			</wa-dialog>
		</Show>
	);
};

export default DeviceLinkApproval;
