import { createSignal, For, onCleanup, Show } from "solid-js";
import {
	buildComboParts,
	formatComboKeys,
	formatComboParts,
	isModifierKey,
} from "#/utils/useHotkey";
import {
	DEFAULT_SHORTCUTS,
	SHORTCUT_ACTIONS,
	SHORTCUT_META,
	type ShortcutAction,
} from "../constants/shortcuts";
import { useShortcuts } from "../hooks/useShortcuts";
import {
	dialogBody,
	dialogLabel,
	shortcutActions,
	shortcutDesc,
	shortcutKeys,
	shortcutMeta,
	shortcutName,
	shortcutRow,
} from "./workspace.css";

const SettingsKeyboardSection = () => {
	const { shortcuts, setShortcut, toggleShortcut, resetShortcut } =
		useShortcuts();

	const [recordingAction, setRecordingAction] =
		createSignal<ShortcutAction | null>(null);
	const [recordingKeys, setRecordingKeys] = createSignal<string[]>([]);
	const [shortcutError, setShortcutError] = createSignal<string | null>(null);
	let removeRecordListener: (() => void) | null = null;

	const stopRecording = () => {
		removeRecordListener?.();
		removeRecordListener = null;
		setRecordingAction(null);
		setRecordingKeys([]);
		setShortcutError(null);
	};

	const handleRecordKeyDown = (event: KeyboardEvent) => {
		if (event.repeat) return;
		if (event.key === "Escape") {
			event.preventDefault();
			event.stopPropagation();
			stopRecording();
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		const parts = buildComboParts(event);

		if (isModifierKey(event.key)) {
			setRecordingKeys(parts);
			return;
		}

		if (parts.length < 2) {
			setRecordingKeys([]);
			setShortcutError("Include a modifier key (Ctrl, Shift, Alt or Cmd).");
			return;
		}

		const combo = parts.join("+");
		setRecordingKeys(parts);

		const duplicates = SHORTCUT_ACTIONS.filter(
			(action) =>
				action !== recordingAction() &&
				shortcuts()[action].combo.toLowerCase() === combo.toLowerCase(),
		);
		if (duplicates.length > 0) {
			setShortcutError(
				`That shortcut is already used by "${SHORTCUT_META[duplicates[0]].label}".`,
			);
			return;
		}

		const action = recordingAction();
		if (action) setShortcut(action, { combo, enabled: true });
		stopRecording();
	};

	const startRecording = (action: ShortcutAction) => {
		stopRecording();
		setRecordingAction(action);
		setShortcutError(null);
		const listen = (e: KeyboardEvent) => handleRecordKeyDown(e);
		document.addEventListener("keydown", listen, true);
		removeRecordListener = () =>
			document.removeEventListener("keydown", listen, true);
	};

	onCleanup(() => removeRecordListener?.());

	const isCustomized = (action: ShortcutAction) => {
		const config = shortcuts()[action];
		const fallback = DEFAULT_SHORTCUTS[action];
		return (
			config.combo.toLowerCase() !== fallback.combo.toLowerCase() ||
			config.enabled !== fallback.enabled
		);
	};

	return (
		<div class={dialogBody}>
			<p class={dialogLabel}>
				Customize keyboard shortcuts. Click the key combination to record a new
				one, or use the switch to enable or disable it. Press Escape to cancel
				while recording.
			</p>
			<For each={SHORTCUT_ACTIONS}>
				{(action) => {
					const meta = SHORTCUT_META[action];
					const keys = () =>
						recordingAction() === action
							? formatComboParts(recordingKeys())
							: formatComboKeys(shortcuts()[action].combo);
					return (
						<div class={shortcutRow}>
							<wa-switch
								checked={shortcuts()[action].enabled}
								aria-label={`Enable ${meta.label}`}
								disabled={recordingAction() === action}
								onChange={(event) =>
									toggleShortcut(
										action,
										Boolean((event.currentTarget as HTMLInputElement).checked),
									)
								}
							></wa-switch>
							<div class={shortcutMeta}>
								<span class={shortcutName}>{meta.label}</span>
								<span class={shortcutDesc}>{meta.description}</span>
							</div>
							<div class={shortcutActions}>
								<wa-button
									size="s"
									variant="neutral"
									appearance="outlined"
									onClick={() =>
										recordingAction() === action
											? stopRecording()
											: startRecording(action)
									}
									aria-label={`Record shortcut for ${meta.label}`}
									title={`Record shortcut for ${meta.label}`}
								>
									{recordingAction() === action &&
									recordingKeys().length === 0 ? (
										<span class={shortcutKeys}>Awaiting input…</span>
									) : (
										<span class={shortcutKeys}>
											<For each={keys()}>
												{(key, idx) => (
													<span>
														{idx() > 0 && " + "}
														{key}
													</span>
												)}
											</For>
										</span>
									)}
								</wa-button>
								<Show
									when={recordingAction() !== action && isCustomized(action)}
								>
									<wa-button
										type="button"
										variant="neutral"
										appearance="plain"
										onClick={() => resetShortcut(action)}
										title="Reset shortcut"
									>
										<wa-icon name="rotate-ccw" label="Reset shortcut"></wa-icon>
									</wa-button>
								</Show>
							</div>
						</div>
					);
				}}
			</For>
			<Show when={shortcutError()}>
				<p
					style={{
						color: "var(--wa-color-danger)",
						"font-size": "0.8rem",
						"margin-top": "var(--wa-space-s)",
					}}
				>
					{shortcutError()}
				</p>
			</Show>
		</div>
	);
};

export default SettingsKeyboardSection;
