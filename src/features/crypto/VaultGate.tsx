import {
	createEffect,
	createMemo,
	createSignal,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import { downloadBlob } from "#/utils/download";
import { getErrorMessage } from "#/utils/misc";
import { detectDeviceLabel } from "./deviceLabel";
import { useVault } from "./VaultProvider";
import { localLinkRequestIds, type TrustedDevice } from "./vault";
import {
	actions,
	body,
	card,
	deviceHint,
	deviceList,
	deviceMeta,
	deviceName,
	deviceRow,
	errorText,
	footer,
	gate,
	quietText,
	recoveryCode,
	title,
	waiting,
} from "./vaultGate.css";

type Panel = "code" | "setup" | "device" | "link" | "recovery";

const ErrorMessage = (props: { message: () => string | null }) => (
	<Show when={props.message()}>
		<p class={errorText}>{props.message()}</p>
	</Show>
);

const formatLastUsed = (device: TrustedDevice): string => {
	const value = device.last_used_at ?? device.created_at;
	if (!value) return "recently";
	const elapsed = Date.now() - new Date(value).getTime();
	if (elapsed < 60_000) return "just now";
	if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)} min ago`;
	if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)} h ago`;
	return `${Math.floor(elapsed / 86_400_000)} d ago`;
};

const VaultGate = (props: { onSignOut: () => void }) => {
	const vault = useVault();
	const deviceLabel = detectDeviceLabel();

	const [busy, setBusy] = createSignal(false);
	const [consuming, setConsuming] = createSignal(false);
	const [message, setMessage] = createSignal<string | null>(null);
	const [panel, setPanel] = createSignal<Panel>(
		vault.hasDevice() ? "device" : "link",
	);
	const [recoveryInput, setRecoveryInput] = createSignal("");
	const [pendingLinkId, setPendingLinkId] = createSignal<string | null>(null);
	const [chosenDeviceId, setChosenDeviceId] = createSignal<string | null>(null);
	const [devicesReady, setDevicesReady] = createSignal(false);

	let linkInitialized = false;

	const pendingLink = () =>
		vault.deviceLinks().find((link) => link.id === pendingLinkId()) ?? null;

	const chosenDevice = () =>
		vault.trustedDevices().find((device) => device.id === chosenDeviceId()) ??
		null;

	const isSetup = () => vault.status() === "unconfigured";

	const activePanel = createMemo<Panel>(() => {
		if (vault.pendingRecoveryCode()) return "code";
		if (isSetup()) return "setup";
		return panel();
	});

	const label = () => {
		switch (activePanel()) {
			case "code":
				return "Save your recovery code";
			case "setup":
				return "Set up encryption";
			case "link": {
				const chosen = chosenDevice();
				if (chosen) return `Confirm your account on ${chosen.device_label}`;
				if (devicesReady() && vault.trustedDevices().length >= 2)
					return "Choose a device to confirm your account";
				return "Confirm your account";
			}
			default:
				return "Unlock your workspace";
		}
	};

	const linkExpired = (link: { expires_at: string }) =>
		new Date(link.expires_at) <= new Date();

	const linkStatus = () => {
		const link = pendingLink();
		if (!link) {
			if (chosenDevice()) return "Sending a request to that device...";
			return "Select a device below to send a request.";
		}
		if (link.status === "approved") return "Approved. Unlocking this device...";
		if (link.status === "rejected") return "That request was rejected.";
		if (linkExpired(link)) return "That request expired.";
		return `Waiting for approval on ${chosenDevice()?.device_label ?? "a trusted device"}.`;
	};

	const ensureDevices = async () => {
		if (devicesReady()) return;
		await vault.refreshTrustedDevices();
		setDevicesReady(true);
	};

	const adoptExistingLink = async () => {
		const ids = localLinkRequestIds();
		if (ids.length === 0) return null;
		if (vault.deviceLinks().length === 0) await vault.refreshDeviceLinks();
		return (
			vault
				.deviceLinks()
				.find(
					(link) =>
						ids.includes(link.id) &&
						(link.status === "approved" ||
							(link.status === "pending" && !linkExpired(link))),
				) ?? null
		);
	};

	const createLinkFor = async (deviceId: string) => {
		setBusy(true);
		setMessage(null);
		try {
			const link = await vault.startLink(deviceLabel, deviceId);
			setChosenDeviceId(deviceId);
			setPendingLinkId(link.requestId);
		} catch (err) {
			setMessage(getErrorMessage(err, "Could not start the device link"));
		} finally {
			setBusy(false);
		}
	};

	const initializeLink = async () => {
		if (linkInitialized) return;
		linkInitialized = true;
		try {
			if (vault.deviceLinks().length === 0) await vault.refreshDeviceLinks();
			const existing = await adoptExistingLink();
			if (existing) {
				setPendingLinkId(existing.id);
				setChosenDeviceId(existing.target_device_id);
			} else {
				const devices = vault.trustedDevices();
				if (devices.length === 1) await createLinkFor(devices[0].id);
			}
		} catch (err) {
			setMessage(getErrorMessage(err, "Could not start the device link"));
		}
	};

	const consumeApproved = async (requestId: string) => {
		if (consuming()) return;
		setConsuming(true);
		setMessage(null);
		try {
			await vault.consumeLink(requestId);
		} catch (err) {
			setMessage(getErrorMessage(err, "Could not finish the device link"));
		} finally {
			setConsuming(false);
		}
	};

	createEffect(() => {
		if (vault.status() !== "locked" || vault.hasDevice()) return;
		if (vault.pendingRecoveryCode() || activePanel() !== "link") return;
		if (!devicesReady()) {
			void ensureDevices();
			return;
		}
		void initializeLink();
	});

	createEffect(() => {
		const link = pendingLink();
		if (link?.status !== "approved" || consuming()) return;
		void consumeApproved(link.id);
	});

	const cancelPendingLink = () => {
		const requestId = pendingLinkId();
		setPendingLinkId(null);
		setChosenDeviceId(null);
		linkInitialized = false;
		if (requestId) void vault.rejectLink(requestId).catch(() => {});
	};

	const chooseAnother = () => {
		cancelPendingLink();
		linkInitialized = true;
	};

	const needsNewRequest = () => {
		const link = pendingLink();
		return (
			Boolean(chosenDeviceId()) &&
			(!link || link.status === "rejected" || linkExpired(link))
		);
	};

	const showLinkPanel = () => {
		setPanel("link");
		if (!devicesReady()) void ensureDevices();
	};

	const handleRetry = async () => {
		if (busy()) return;
		setBusy(true);
		setMessage(null);
		try {
			await vault.setup();
		} catch (err) {
			setMessage(getErrorMessage(err, "Something went wrong"));
		} finally {
			setBusy(false);
		}
	};

	const handleRecoverySubmit = async () => {
		if (busy()) return;
		setBusy(true);
		setMessage(null);
		try {
			await vault.unlockWithRecoveryCode(recoveryInput());
			cancelPendingLink();
		} catch (err) {
			setMessage(getErrorMessage(err, "Something went wrong"));
		} finally {
			setBusy(false);
		}
	};

	const handleDeviceUnlock = async () => {
		if (busy()) return;
		setBusy(true);
		setMessage(null);
		try {
			await vault.unlockFromDevice();
			cancelPendingLink();
		} catch (err) {
			setMessage(getErrorMessage(err, "Something went wrong"));
		} finally {
			setBusy(false);
		}
	};

	const downloadRecoveryCode = async () => {
		const code = vault.pendingRecoveryCode();
		if (!code) return;
		try {
			const mdContent = `# Recovery Code

Your OpenCadre recovery code:

\`\`\`
${code}
\`\`\`

*Store this code somewhere safe. It is the only way back into your encrypted workspace if you lose this device. It is shown once and cannot be recovered.*
`;
			const blob = new Blob([mdContent], {
				type: "text/markdown;charset=utf-8",
			});
			downloadBlob(blob, "recovery-code.md");
		} catch {
			setMessage("Failed to generate download");
		}
	};

	return (
		<main class={gate}>
			<div class={card}>
				<h1 class={title}>{label()}</h1>
				<div class={body}>
					<Switch>
						<Match when={activePanel() === "code"}>
							<Show when={vault.pendingRecoveryCode()}>
								{(code) => (
									<>
										<p>
											Save this code somewhere safe. It is only shown once, and
											you will need it to unlock your workspace on a new device.
											This device will unlock automatically.
										</p>
										<code class={recoveryCode}>
											{code()}
											<wa-copy-button
												value={code()}
												copy-label="Copy recovery code"
												success-label="Recovery code copied!"
											></wa-copy-button>
										</code>
										<div class={actions}>
											<wa-button
												variant="brand"
												appearance="outlined"
												onClick={() => downloadRecoveryCode()}
											>
												<wa-icon name="download" slot="start"></wa-icon>
												Download as .md
											</wa-button>
											<wa-button
												variant="brand"
												onClick={() => vault.clearPendingRecoveryCode()}
											>
												I saved it
											</wa-button>
										</div>
									</>
								)}
							</Show>
						</Match>
						<Match when={activePanel() === "setup"}>
							<p class={quietText}>
								Encryption could not be enabled automatically. Check your
								connection and try again.
							</p>
							<ErrorMessage message={() => message() ?? vault.error()} />
							<wa-button
								variant="brand"
								disabled={busy()}
								onClick={handleRetry}
							>
								Try again
							</wa-button>
						</Match>
						<Match when={activePanel() === "device"}>
							<p class={quietText}>
								This device is already registered. Unlock directly, or use
								another sign-in method.
							</p>
							<ErrorMessage message={() => message() ?? vault.error()} />
							<div class={actions}>
								<wa-button
									variant="brand"
									disabled={busy()}
									onClick={handleDeviceUnlock}
								>
									Unlock with this device
								</wa-button>
								<wa-button
									variant="neutral"
									appearance="plain"
									onClick={() => setPanel("recovery")}
								>
									Use a recovery code
								</wa-button>
								<wa-button
									variant="neutral"
									appearance="plain"
									onClick={showLinkPanel}
								>
									Link another device
								</wa-button>
							</div>
						</Match>
						<Match when={activePanel() === "link"}>
							<Show
								when={devicesReady() && vault.trustedDevices().length === 0}
							>
								<p class={quietText}>
									No trusted devices are available. Use your recovery code to
									unlock this device instead.
								</p>
							</Show>

							<Show
								when={
									devicesReady() &&
									vault.trustedDevices().length >= 2 &&
									!chosenDevice()
								}
							>
								<p class={quietText}>
									Pick a device that is open and unlocked to approve this
									sign-in.
								</p>
								<div class={deviceList}>
									<For each={vault.trustedDevices()}>
										{(device) => (
											<div class={deviceRow}>
												<div class={deviceMeta}>
													<span class={deviceName}>{device.device_label}</span>
													<span class={deviceHint}>
														Last used {formatLastUsed(device)}
													</span>
												</div>
												<wa-button
													variant="brand"
													appearance="outlined"
													disabled={busy()}
													onClick={() => void createLinkFor(device.id)}
												>
													Use this device
												</wa-button>
											</div>
										)}
									</For>
								</div>
							</Show>

							<Show when={chosenDevice() || pendingLink()}>
								<p class={quietText}>
									Approve this sign-in from a device you already trust. Keep
									this screen open. Your vault unlocks automatically once
									approved.
								</p>
								<div class={waiting}>
									<wa-spinner></wa-spinner>
									<span>{linkStatus()}</span>
								</div>
							</Show>

							<ErrorMessage message={() => message() ?? vault.error()} />

							<Show when={pendingLink()?.status === "approved"}>
								<wa-button
									variant="brand"
									disabled={busy() || consuming()}
									onClick={() => void consumeApproved(pendingLink()!.id)}
								>
									Finish linking now
								</wa-button>
							</Show>
							<Show when={needsNewRequest()}>
								<wa-button
									variant="neutral"
									appearance="outlined"
									disabled={busy()}
									onClick={() => void createLinkFor(chosenDeviceId()!)}
								>
									Send a new request
								</wa-button>
							</Show>
							<Show when={vault.trustedDevices().length >= 2 && chosenDevice()}>
								<wa-button
									variant="neutral"
									appearance="plain"
									onClick={chooseAnother}
								>
									Choose a different device
								</wa-button>
							</Show>
							<wa-button
								variant="neutral"
								appearance="plain"
								onClick={() => setPanel("recovery")}
							>
								Use a recovery code instead
							</wa-button>
						</Match>
						<Match when={activePanel() === "recovery"}>
							<p class={quietText}>
								Enter the recovery code you saved when you set up encryption.
							</p>
							<wa-input
								label="Recovery code"
								placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
								value={recoveryInput()}
								onInput={(e: Event) =>
									setRecoveryInput((e.currentTarget as HTMLInputElement).value)
								}
								onKeyDown={(e: KeyboardEvent) => {
									if (e.key === "Enter") void handleRecoverySubmit();
								}}
							></wa-input>
							<ErrorMessage message={() => message() ?? vault.error()} />
							<div class={actions}>
								<wa-button
									variant="brand"
									disabled={busy()}
									onClick={handleRecoverySubmit}
								>
									Unlock with recovery code
								</wa-button>
								<wa-button
									variant="neutral"
									appearance="plain"
									onClick={showLinkPanel}
								>
									Use device approval instead
								</wa-button>
							</div>
						</Match>
					</Switch>
				</div>
				<div class={footer}>
					<wa-button
						variant="neutral"
						appearance="plain"
						onClick={props.onSignOut}
					>
						Sign out
					</wa-button>
				</div>
			</div>
		</main>
	);
};

export default VaultGate;
