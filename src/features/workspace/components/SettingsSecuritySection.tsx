import { createSignal, For, onMount, Show } from "solid-js";
import { useAuth } from "#/features/auth/AuthContext";
import { useVault } from "#/features/crypto/VaultProvider";
import type { TrustedDevice } from "#/features/crypto/vault";
import ConfirmDialog from "#/features/ui/ConfirmDialog";
import ReauthDialog from "#/features/ui/ReauthDialog";
import { formatDateTime } from "#/utils/date";
import { getErrorMessage } from "#/utils/misc";
import { canManageMembers } from "../constants/roles";
import { useWorkspaceMembersAdapter } from "../hooks/useWorkspaceMembersAdapter";
import {
	codeBlock,
	dangerText,
	dialogBody,
	dialogLabel,
	memberEmail,
	memberMeta,
	memberName,
	settingsActions,
	settingsRowWithGap,
	settingsSection,
	settingsSectionTitle,
} from "./workspace.css";

interface SettingsSecuritySectionProps {
	workspaceId: string;
}

const SettingsSecuritySection = (props: SettingsSecuritySectionProps) => {
	const vault = useVault();
	const { signOutOthers } = useAuth();
	const { myRole } = useWorkspaceMembersAdapter(() => props.workspaceId);

	const [message, setMessage] = createSignal<string | null>(null);
	const [busyLinkId, setBusyLinkId] = createSignal<string | null>(null);
	const [reauthNeeded, setReauthNeeded] = createSignal(false);
	const [newCode, setNewCode] = createSignal<string | null>(null);
	const [showSignOutOthers, setShowSignOutOthers] = createSignal(false);
	const [deviceToForget, setDeviceToForget] =
		createSignal<TrustedDevice | null>(null);

	onMount(() => {
		void vault.refreshTrustedDevices();
	});

	const otherDevices = () =>
		vault.trustedDevices().filter((device) => device.id !== vault.deviceId());

	const isAdmin = () => Boolean(myRole() && canManageMembers(myRole()!));

	const activeRotation = () =>
		vault
			.pendingRotations()
			.find((rotation) => rotation.workspace_id === props.workspaceId) ?? null;

	const failedRotation = () => {
		const failed = vault.failedRotation();
		return failed?.workspace_id === props.workspaceId ? failed : null;
	};

	const handleApprove = async (requestId: string) => {
		setMessage(null);
		setBusyLinkId(requestId);
		try {
			await vault.approveLink(requestId);
		} catch (err) {
			setMessage(getErrorMessage(err, "Could not approve the device link."));
		} finally {
			setBusyLinkId(null);
		}
	};

	const handleReject = async (requestId: string) => {
		setMessage(null);
		setBusyLinkId(requestId);
		try {
			await vault.rejectLink(requestId);
		} catch (err) {
			setMessage(getErrorMessage(err, "Could not reject the device link."));
		} finally {
			setBusyLinkId(null);
		}
	};

	const handleSignOutOthers = async () => {
		setMessage(null);
		try {
			await signOutOthers();
			setMessage("Other devices have been signed out.");
		} catch (err) {
			setMessage(getErrorMessage(err, "Could not sign out other devices."));
		}
	};

	const handleSecureNow = async () => {
		setMessage(null);
		try {
			await vault.startRotation(props.workspaceId);
		} catch (err) {
			setMessage(getErrorMessage(err, "Could not start workspace security."));
		}
	};

	const handleRetryRotation = async () => {
		setMessage(null);
		try {
			await vault.retryRotation(props.workspaceId);
		} catch (err) {
			setMessage(getErrorMessage(err, "Could not retry workspace security."));
		}
	};

	const handleNewRecoveryCode = async () => {
		setNewCode(await vault.newRecoveryCode());
	};

	const handleForgetDevice = async () => {
		const device = deviceToForget();
		if (!device) return;
		setMessage(null);
		try {
			await vault.forgetDevice(device.id);
			setMessage(`${device.device_label || "Device"} is no longer trusted.`);
			setDeviceToForget(null);
		} catch (err) {
			setMessage(getErrorMessage(err, "Could not forget that device."));
		}
	};

	return (
		<div class={dialogBody}>
			<h3 class={settingsSectionTitle}>Recovery</h3>
			<wa-divider style={{ "--spacing": "0" }}></wa-divider>
			<div class={settingsSection}>
				<p class={dialogLabel}>
					Your recovery code is the only way back into encrypted content on a
					new device. Generating a new code invalidates the previous one. You
					must re-enter your password first.
				</p>
				<div class={settingsActions}>
					<wa-button
						type="button"
						variant="neutral"
						appearance="outlined"
						onClick={() => setReauthNeeded(true)}
					>
						Generate a new recovery code
					</wa-button>
				</div>
				<Show when={newCode()}>
					{(code) => (
						<>
							<p class={dialogLabel}>
								Save this code now. It will not be shown again.
							</p>
							<code class={codeBlock}>{code()}</code>
							<div class={settingsActions}>
								<wa-button
									type="button"
									variant="brand"
									onClick={() => setNewCode(null)}
								>
									I saved it
								</wa-button>
							</div>
						</>
					)}
				</Show>
			</div>

			<h3 class={settingsSectionTitle}>Trusted devices</h3>
			<wa-divider style={{ "--spacing": "0" }}></wa-divider>
			<div class={settingsSection}>
				<p class={dialogLabel}>
					A new device requests approval here. Only approve a device you own
					while your vault is unlocked on this device.
				</p>
				<Show
					when={vault.deviceLinks().length > 0}
					fallback={<p class={dialogLabel}>No device link requests yet.</p>}
				>
					<For each={vault.deviceLinks()}>
						{(link) => (
							<div class={settingsRowWithGap}>
								<div class={memberMeta}>
									<span class={memberName}>
										{link.device_label || "Unnamed device"}
									</span>
									<span class={memberEmail}>
										{link.status} · Expires{" "}
										{new Date(link.expires_at).toLocaleString()}
									</span>
								</div>
								<Show when={link.status === "pending"}>
									<div class={settingsActions}>
										<wa-button
											type="button"
											variant="brand"
											appearance="outlined"
											disabled={busyLinkId() === link.id}
											onClick={() => void handleApprove(link.id)}
										>
											Approve
										</wa-button>
										<wa-button
											type="button"
											variant="neutral"
											appearance="plain"
											disabled={busyLinkId() === link.id}
											onClick={() => void handleReject(link.id)}
										>
											Reject
										</wa-button>
									</div>
								</Show>
							</div>
						)}
					</For>
				</Show>
				<p class={dialogLabel}>
					Forget another trusted device to revoke its ability to unlock your
					vault. This device stays trusted and cannot be removed here.
				</p>
				<Show
					when={otherDevices().length > 0}
					fallback={<p class={dialogLabel}>No other trusted devices.</p>}
				>
					<For each={otherDevices()}>
						{(device) => (
							<div class={settingsRowWithGap}>
								<div class={memberMeta}>
									<span class={memberName}>
										{device.device_label || "Unnamed device"}
									</span>
									<span class={memberEmail}>
										Last used{" "}
										{device.last_used_at
											? formatDateTime(device.last_used_at)
											: "never"}
									</span>
								</div>
								<wa-button
									type="button"
									variant="neutral"
									appearance="outlined"
									size="s"
									onClick={() => setDeviceToForget(device)}
								>
									Forget
								</wa-button>
							</div>
						)}
					</For>
				</Show>
			</div>

			<h3 class={settingsSectionTitle}>Sessions</h3>
			<wa-divider style={{ "--spacing": "0" }}></wa-divider>
			<div class={settingsSection}>
				<p class={dialogLabel}>
					End the session on every other device. This device stays signed in.
				</p>
				<div class={settingsActions}>
					<wa-button
						type="button"
						variant="neutral"
						appearance="outlined"
						onClick={() => setShowSignOutOthers(true)}
					>
						Sign out of other devices
					</wa-button>
				</div>
			</div>

			<h3 class={settingsSectionTitle}>Workspace security</h3>
			<wa-divider style={{ "--spacing": "0" }}></wa-divider>
			<div class={settingsSection}>
				<Show when={vault.rotationRequired(props.workspaceId)}>
					<p class={dangerText}>
						This workspace needs security maintenance. An owner or admin must
						secure it.
					</p>
				</Show>
				<Show when={activeRotation()}>
					{(rotation) => (
						<p class={dialogLabel}>
							Securing workspace
							{rotation().total_count > 0
								? ` (${rotation().processed_count}/${rotation().total_count})`
								: ""}
							. Content remains readable and new writes use the new key.
						</p>
					)}
				</Show>
				<Show when={failedRotation()}>
					<p class={dangerText}>
						The last security pass failed (
						{failedRotation()?.error_code ?? "unknown"}
						). New writes already use the new key.
					</p>
				</Show>
				<p class={dialogLabel}>
					When a member is removed, their access is revoked and this workspace
					is re-encrypted with a fresh key. A removed member may still decrypt
					content they already downloaded before re-encryption finishes.
				</p>
				<div class={settingsActions}>
					<Show when={isAdmin()}>
						<wa-button
							type="button"
							variant="neutral"
							appearance="outlined"
							disabled={Boolean(activeRotation())}
							onClick={() => void handleSecureNow()}
						>
							Secure now
						</wa-button>
					</Show>
					<Show when={failedRotation()}>
						<wa-button
							type="button"
							variant="brand"
							disabled={!isAdmin()}
							onClick={() => void handleRetryRotation()}
						>
							Retry security pass
						</wa-button>
					</Show>
				</div>
			</div>

			<Show when={message()}>
				<p class={dangerText}>{message()}</p>
			</Show>

			<Show when={reauthNeeded()}>
				<ReauthDialog
					label="Confirm recovery change"
					message="Re-enter your password to generate a new recovery code."
					onAuthenticated={handleNewRecoveryCode}
					onClose={() => setReauthNeeded(false)}
				></ReauthDialog>
			</Show>

			<Show when={showSignOutOthers()}>
				<ConfirmDialog
					label="Sign out of other devices"
					message="All other sessions will end. You will stay signed in here."
					onConfirm={handleSignOutOthers}
					onClose={() => setShowSignOutOthers(false)}
				/>
			</Show>

			<Show when={deviceToForget()}>
				{(device) => (
					<ConfirmDialog
						label="Forget trusted device"
						message={`${device().device_label || "That device"} will no longer be able to unlock your vault. It will need your recovery code or an approval from another trusted device. This device stays trusted.`}
						onConfirm={handleForgetDevice}
						onClose={() => setDeviceToForget(null)}
					/>
				)}
			</Show>
		</div>
	);
};

export default SettingsSecuritySection;
