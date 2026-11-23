import { createSignal, For, Show } from "solid-js";
import { useAuth } from "#/features/auth/AuthContext";
import { useVault } from "#/features/crypto/VaultProvider";
import ConfirmDialog from "#/features/ui/ConfirmDialog";
import { dropdownItemValue, getErrorMessage } from "#/utils/misc";
import { emailPrefix } from "#/utils/string";
import { type ThemePreference, useTheme } from "#theme/ThemeProvider";
import { useProfile } from "../hooks/useProfile";
import {
	borderedSettingsRow,
	dangerText,
	dangerZone,
	deleteErrorText,
	dialogBody,
	dialogLabel,
	flexEndRow,
	settingsRow,
	settingsRowWithGap,
	settingsSection,
	settingsSectionTitle,
	workspaceDangerRow,
} from "./workspace.css";

const THEME_PREFERENCES: {
	value: ThemePreference;
	label: string;
	icon: string;
}[] = [
	{ value: "system", label: "System", icon: "monitor" },
	{ value: "light", label: "Light", icon: "sun" },
	{ value: "dark", label: "Dark", icon: "moon" },
];

const isThemePreference = (
	value: string | undefined,
): value is ThemePreference =>
	value === "system" || value === "light" || value === "dark";

const SettingsGeneralSection = () => {
	const { user, deleteAccount } = useAuth();
	const vault = useVault();
	const { themePreference, setThemePreference } = useTheme();
	const { name: profileName, setCustomName } = useProfile(user);

	const [nameDraft, setNameDraft] = createSignal<string | null>(null);
	const [showDeleteDialog, setShowDeleteDialog] = createSignal(false);
	const [deleteError, setDeleteError] = createSignal<string | null>(null);

	const currentTheme = () =>
		THEME_PREFERENCES.find((option) => option.value === themePreference()) ??
		THEME_PREFERENCES[0];

	const emailPrefixOf = () => {
		const email = user()?.email;
		return email ? emailPrefix(email) : "";
	};

	const displayNameValue = () => nameDraft() ?? profileName();

	const handleDisplayNameInput = (e: Event) => {
		setNameDraft((e.currentTarget as HTMLInputElement).value || null);
	};

	const handleDisplayNameCommit = () => {
		const next = (nameDraft() ?? "").trim();
		setCustomName(next || null);
		setNameDraft(null);
	};

	const handleThemeSelect = (e: Event) => {
		const value = dropdownItemValue(e);
		if (isThemePreference(value)) setThemePreference(value);
	};

	const [privacyError, setPrivacyError] = createSignal<string | null>(null);

	const handleRememberDevice = async () => {
		setPrivacyError(null);
		try {
			await vault.rememberThisDevice();
		} catch (err) {
			setPrivacyError(getErrorMessage(err, "Could not remember this device"));
		}
	};

	const handleDeleteAccount = async () => {
		setDeleteError(null);
		try {
			await deleteAccount();
			window.location.href = "/";
		} catch (err) {
			setDeleteError(
				getErrorMessage(
					err,
					"Something went wrong deleting your account. Please try again.",
				),
			);
		}
	};

	return (
		<div class={dialogBody}>
			<h3 class={settingsSectionTitle}>Appearance</h3>
			<wa-divider style={{ "--spacing": "0" }}></wa-divider>
			<div class={settingsSection}>
				<div class={settingsRow}>
					<div class={dialogBody}>
						Theme
						<small style={{ color: "var(--wa-color-text-quiet)" }}>
							Custom themes are coming!
						</small>
					</div>
					<wa-dropdown
						placement="bottom-start"
						on:wa-after-hide={(e) => e.stopPropagation()}
						on:wa-select={handleThemeSelect}
					>
						<wa-button
							type="button"
							slot="trigger"
							variant="neutral"
							appearance="outlined"
							with-caret
							style={{ width: "fit-content" }}
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
			</div>

			<h3 class={settingsSectionTitle}>Profile</h3>
			<wa-divider style={{ "--spacing": "0" }}></wa-divider>
			<div class={settingsSection}>
				<div class={flexEndRow}>
					<wa-input
						style={{ "flex-grow": "1" }}
						label="Display name"
						placeholder={emailPrefixOf() || "Your name"}
						value={displayNameValue()}
						onInput={handleDisplayNameInput}
						onChange={handleDisplayNameCommit}
					></wa-input>
				</div>
				<wa-input label="Email" value={user()?.email ?? ""} disabled></wa-input>
				<p class={dialogLabel}>
					Your display name appears on comments, assignees and the members list.
				</p>
			</div>

			<h3 class={settingsSectionTitle}>Privacy</h3>
			<wa-divider style={{ "--spacing": "0" }}></wa-divider>
			<div class={settingsSection}>
				<div class={settingsRowWithGap}>
					<div class={dialogBody}>
						End-to-end encryption
						<small style={{ color: "var(--wa-color-text-quiet)" }}>
							On. Content is encrypted in this browser.
						</small>
					</div>
					<wa-button
						type="button"
						variant="neutral"
						appearance="outlined"
						onClick={() => vault.lock()}
					>
						Lock now
					</wa-button>
				</div>

				<div class={borderedSettingsRow}>
					<div class={dialogBody}>
						This device
						<small style={{ color: "var(--wa-color-text-quiet)" }}>
							{vault.hasDevice()
								? "Unlocks automatically on this device"
								: "Use your recovery code on this device"}
						</small>
					</div>
					<Show
						when={!vault.hasDevice()}
						fallback={
							<wa-tag appearance="outlined">Trusted on this device</wa-tag>
						}
					>
						<wa-button
							type="button"
							variant="neutral"
							appearance="outlined"
							disabled={vault.status() !== "unlocked"}
							onClick={handleRememberDevice}
						>
							Remember device
						</wa-button>
					</Show>
				</div>

				<div class={borderedSettingsRow}>
					<div class={dialogBody}>
						Recovery code
						<small style={{ color: "var(--wa-color-text-quiet)" }}>
							Regenerate codes in the Security section, where re-authentication
							and one-time acknowledgement are required.
						</small>
					</div>
				</div>

				<Show when={privacyError()}>
					<p class={dangerText}>{privacyError()}</p>
				</Show>
			</div>

			<h3 class={settingsSectionTitle}>Danger Zone</h3>
			<wa-divider style={{ "--spacing": "0" }}></wa-divider>
			<div class={dangerZone}>
				<div class={workspaceDangerRow}>
					<div>
						<strong>Delete account</strong>
						<p class={dialogLabel} style={{ "margin-block": "0" }}>
							Permanently delete your account and all associated data. This
							action cannot be undone. Once deleted you will be redirected to
							the login page.
						</p>
					</div>
					<wa-button
						variant="danger"
						appearance="outlined"
						onClick={() => setShowDeleteDialog(true)}
					>
						<wa-icon slot="start" name="trash-2" label="Delete"></wa-icon>
						Delete Account
					</wa-button>
				</div>
			</div>

			<wa-divider style={{ "--color": "transparent" }}></wa-divider>

			<Show when={showDeleteDialog()}>
				<ConfirmDialog
					label="Delete Account"
					message="This will permanently delete your account and all data including workspaces you own. Members will lose access. This cannot be undone."
					confirmText={user()?.email}
					onConfirm={handleDeleteAccount}
					onClose={() => setShowDeleteDialog(false)}
				/>
			</Show>

			<Show when={deleteError()}>
				<p class={deleteErrorText}>{deleteError()}</p>
			</Show>
		</div>
	);
};

export default SettingsGeneralSection;
