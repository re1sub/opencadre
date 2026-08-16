import { createSignal, For, Show } from "solid-js";
import { useAuth } from "#/features/auth/AuthContext";
import { useDialog } from "#/utils/useDialog";
import { type ThemePreference, useTheme } from "#theme/ThemeProvider";
import {
	dialogBody,
	dialogLabel,
	kbd,
	settingsBack,
	settingsDialogContainer,
	settingsFooter,
	settingsFooterSpacer,
	settingsLayout,
	settingsNav,
	settingsNavButton,
	settingsPanel,
	settingsPanelOpen,
	settingsSection,
	settingsSectionTitle,
	shortcutKeys,
	shortcutRow,
} from "./workspace.css";

interface SettingsDialogProps {
	onClose: () => void;
}

type SettingsSection = "general" | "keyboard" | "notifications";

const SECTIONS: {
	value: SettingsSection;
	label: string;
	icon: string;
}[] = [
	{ value: "general", label: "General", icon: "settings" },
	{ value: "keyboard", label: "Keyboard", icon: "keyboard" },
	{ value: "notifications", label: "Notifications", icon: "bell" },
];

const THEME_PREFERENCES: {
	value: ThemePreference;
	label: string;
	icon: string;
}[] = [
	{ value: "system", label: "System", icon: "monitor" },
	{ value: "light", label: "Light", icon: "sun" },
	{ value: "dark", label: "Dark", icon: "moon" },
];

const PLACEHOLDER_SHORTCUTS = [
	{ action: "New page", keys: ["Ctrl", "Shift", "N"] },
	{ action: "Toggle theme", keys: ["Ctrl", "J"] },
	{ action: "Open settings", keys: ["Ctrl", ","] },
];

const isThemePreference = (
	value: string | undefined,
): value is ThemePreference =>
	value === "system" || value === "light" || value === "dark";

const SettingsDialog = (props: SettingsDialogProps) => {
	const dialog = useDialog(props.onClose);
	const { user } = useAuth();
	const { themePreference, setThemePreference } = useTheme();

	const [section, setSection] = createSignal<SettingsSection>("general");
	const [panelOpen, setPanelOpen] = createSignal(false);

	const currentTheme = () =>
		THEME_PREFERENCES.find((option) => option.value === themePreference()) ??
		THEME_PREFERENCES[0];

	const selectSection = (value: SettingsSection) => {
		setSection(value);
		setPanelOpen(true);
	};

	const handleThemeSelect = (e: Event) => {
		const selectEvent = e as unknown as {
			detail: { item: { value?: string } | null };
		};
		const value = selectEvent.detail.item?.value;
		if (isThemePreference(value)) setThemePreference(value);
	};

	return (
		<wa-dialog
			ref={dialog.ref}
			light-dismiss
			label="Settings"
			on:wa-after-hide={dialog.handleHide}
			class={settingsDialogContainer}
		>
			<div class={settingsLayout}>
				<nav class={settingsNav} aria-label="Settings sections">
					<For each={SECTIONS}>
						{(item) => (
							<wa-button
								type="button"
								variant={section() === item.value ? "brand" : "neutral"}
								with-caret
								appearance="plain"
								aria-current={section() === item.value ? "true" : undefined}
								class={settingsNavButton}
								onClick={() => selectSection(item.value)}
							>
								<wa-icon
									slot="start"
									name={item.icon}
									label={item.label}
								></wa-icon>
								{item.label}
							</wa-button>
						)}
					</For>
				</nav>

				<div class={`${settingsPanel} ${panelOpen() ? settingsPanelOpen : ""}`}>
					<wa-button
						type="button"
						variant="neutral"
						appearance="plain"
						class={settingsBack}
						onClick={() => setPanelOpen(false)}
					>
						<wa-icon slot="start" name="chevron-left" label="Back"></wa-icon>
						Back
					</wa-button>

					<Show when={section() === "general"}>
						<div class={dialogBody}>
							<div class={settingsSection}>
								<p class={settingsSectionTitle}>Appearance</p>
								<wa-dropdown
									placement="bottom-start"
									on:wa-after-hide={(e) => e.stopPropagation()}
									on:wa-select={handleThemeSelect}
								>
									<wa-button
										type="button"
										slot="trigger"
										variant="neutral"
										appearance="plain"
										with-caret
										class={settingsNavButton}
									>
										<wa-icon
											slot="start"
											name={currentTheme().icon}
											label="Theme"
										></wa-icon>
										{currentTheme().label}
									</wa-button>

									<For each={THEME_PREFERENCES}>
										{(option) => (
											<wa-dropdown-item value={option.value}>
												<wa-icon
													slot="icon"
													name={option.icon}
													label={option.label}
												></wa-icon>
												{option.label}
											</wa-dropdown-item>
										)}
									</For>
								</wa-dropdown>
							</div>

							<div class={settingsSection}>
								<p class={settingsSectionTitle}>Profile</p>
								<wa-input
									label="Email"
									value={user()?.email ?? ""}
									disabled
								></wa-input>
								<p class={dialogLabel}>
									Usernames aren't available yet — your email is used for now.
								</p>
							</div>
						</div>
					</Show>

					<Show when={section() === "keyboard"}>
						<div class={dialogBody}>
							<p class={dialogLabel}>
								Keyboard shortcut configuration is a future feature. Here's a
								preview of what's coming.
							</p>
							<For each={PLACEHOLDER_SHORTCUTS}>
								{(shortcut) => (
									<div class={shortcutRow}>
										<span style={{ color: "var(--wa-color-text-normal)" }}>
											{shortcut.action}
										</span>
										<wa-divider orientation="vertical"></wa-divider>
										<span class={shortcutKeys}>
											<For each={shortcut.keys}>
												{(key) => <span class={kbd}>{key}</span>}
											</For>
										</span>
									</div>
								)}
							</For>
						</div>
					</Show>

					<Show when={section() === "notifications"}>
						<div class={dialogBody}>
							<p class={dialogLabel}>
								Notification preferences are a future feature. Here's a preview
								of the options.
							</p>
							<div class={settingsSection}>
								<For
									each={[
										{ label: "Email notifications", key: "email" },
										{ label: "In-app notifications", key: "inapp" },
										{ label: "When I'm mentioned", key: "mentions" },
										{ label: "Comments on my cards", key: "comments" },
									]}
								>
									{(item) => (
										<div
											style={{
												display: "flex",
												"align-items": "center",
												"justify-content": "space-between",
												gap: "var(--wa-space-s)",
											}}
										>
											<span style={{ color: "var(--wa-color-text-normal)" }}>
												{item.label}
											</span>
											<wa-switch disabled aria-label={item.label}></wa-switch>
										</div>
									)}
								</For>
							</div>
						</div>
					</Show>
				</div>
			</div>

			<div slot="footer">
				<div class={settingsFooter}>
					<Show when={section() !== "general"}>
						<wa-tag variant="warning">Planned</wa-tag>
					</Show>
					<span class={settingsFooterSpacer}></span>
					<wa-button variant="brand" onClick={dialog.close}>
						Done
					</wa-button>
				</div>
			</div>
		</wa-dialog>
	);
};

export default SettingsDialog;
