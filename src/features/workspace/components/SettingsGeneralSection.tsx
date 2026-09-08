import { createSignal, For } from "solid-js";
import { useAuth } from "#/features/auth/AuthContext";
import { dropdownItemValue, getInitials } from "#/utils/misc";
import { emailPrefix } from "#/utils/string";
import { supabase } from "#/utils/supabase";
import { type ThemePreference, useTheme } from "#theme/ThemeProvider";
import { useProfile } from "../hooks/useProfile";
import {
	dialogBody,
	dialogLabel,
	memberAvatar,
	settingsSection,
	settingsSectionTitle,
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
	const { user } = useAuth();
	const { themePreference, setThemePreference } = useTheme();
	const { name: profileName, setCustomName } = useProfile(user);

	const [nameDraft, setNameDraft] = createSignal<string | null>(null);

	const currentTheme = () =>
		THEME_PREFERENCES.find((option) => option.value === themePreference()) ??
		THEME_PREFERENCES[0];

	const emailPrefixOf = () => {
		const email = user()?.email;
		return email ? emailPrefix(email) : "";
	};

	const displayNameValue = () => nameDraft() ?? profileName();

	const handleDisplayNameInput = (e: Event) => {
		const value = (e.currentTarget as HTMLInputElement).value || null;
		setNameDraft(value);
		setCustomName(value);
	};

	const handleDisplayNameCommit = () => {
		const next = (nameDraft() ?? "").trim();
		setCustomName(next || null);
		setNameDraft(null);
		void supabase.auth.updateUser({
			data: { display_name: next || null },
		});
	};

	const handleThemeSelect = (e: Event) => {
		const value = dropdownItemValue(e);
		if (isThemePreference(value)) setThemePreference(value);
	};

	return (
		<div class={dialogBody}>
			<h3 class={settingsSectionTitle}>Appearance</h3>
			<wa-divider style={{ "--spacing": "0" }}></wa-divider>
			<div class={settingsSection}>
				<div
					style={{
						display: "flex",
						"align-items": "center",
						"justify-content": "space-between",
					}}
				>
					<div class={dialogBody}>
						Theme
						<small style={{ color: "var(--wa-color-text-quiet" }}>
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
				<div
					style={{
						display: "flex",
						"align-items": "center",
						gap: "var(--wa-space-s)",
					}}
				>
					<span
						class={memberAvatar}
						style={{
							"background-color":
								"var(--wa-color-brand-fill-loud, var(--wa-color-brand))",
						}}
					>
						{profileName() ? getInitials(profileName()) : "?"}
					</span>
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
		</div>
	);
};

export default SettingsGeneralSection;
