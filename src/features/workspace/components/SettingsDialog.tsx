import { createSignal, For, Show } from "solid-js";
import { useAuth } from "#/features/auth/AuthContext";
import DeleteButton from "#/features/ui/DeleteButton";
import { useDialog } from "#/utils/useDialog";
import { type ThemePreference, useTheme } from "#theme/ThemeProvider";
import { CURRENT_MEMBER_ID } from "../constants/members";
import {
	ASSIGNABLE_ROLES,
	canManageMembers,
	canModifyMember,
	isWorkspaceRole,
	ROLE_META,
} from "../constants/roles";
import { useProfile } from "../hooks/useProfile";
import { useWorkspaceMembers } from "../hooks/useWorkspaceMembers";
import type { WorkspaceRole } from "../types";
import {
	dialogBody,
	dialogLabel,
	kbd,
	memberAddRow,
	memberAvatar,
	memberEmail,
	memberMeta,
	memberName,
	memberRow,
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

export type SettingsSection =
	| "general"
	| "members"
	| "keyboard"
	| "notifications";

interface SettingsDialogProps {
	workspaceId: string;
	initialSection?: SettingsSection;
	onClose: () => void;
}

const SECTIONS: {
	value: SettingsSection;
	label: string;
	icon: string;
}[] = [
	{ value: "general", label: "General", icon: "settings" },
	{ value: "members", label: "Members", icon: "users" },
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

const KEYBOARD_SHORTCUTS = [
	{ action: "New page", keys: ["Ctrl", "Shift", "N"] },
	{ action: "Toggle theme", keys: ["Ctrl", "L"] },
	{ action: "Open settings", keys: ["Ctrl", ","] },
];

const isThemePreference = (
	value: string | undefined,
): value is ThemePreference =>
	value === "system" || value === "light" || value === "dark";

const initialsOf = (name: string) => name.slice(0, 2).toUpperCase();

const dropdownItemValue = (e: Event) => {
	const selectEvent = e as unknown as {
		detail: { item: { value?: string } | null };
	};
	return selectEvent.detail.item?.value;
};

const SettingsDialog = (props: SettingsDialogProps) => {
	const dialog = useDialog(props.onClose);
	const { user } = useAuth();
	const { themePreference, setThemePreference } = useTheme();
	const {
		name: profileName,
		customName,
		setCustomName,
	} = useProfile(() => user()?.email);
	const { members, myRole, addMember, updateRole, removeMember } =
		useWorkspaceMembers(props.workspaceId);

	const [section, setSection] = createSignal<SettingsSection>(
		props.initialSection ?? "general",
	);
	const [panelOpen, setPanelOpen] = createSignal(Boolean(props.initialSection));

	const [newEmail, setNewEmail] = createSignal("");
	const [newRole, setNewRole] = createSignal<WorkspaceRole>("member");
	const [memberError, setMemberError] = createSignal<string | null>(null);

	const currentTheme = () =>
		THEME_PREFERENCES.find((option) => option.value === themePreference()) ??
		THEME_PREFERENCES[0];

	const emailPrefix = () => {
		const email = user()?.email;
		return email ? email.split("@")[0] : "";
	};

	const selectSection = (value: SettingsSection) => {
		setSection(value);
		setPanelOpen(true);
	};

	const handleThemeSelect = (e: Event) => {
		const value = dropdownItemValue(e);
		if (isThemePreference(value)) setThemePreference(value);
	};

	const handleNewRoleSelect = (e: Event) => {
		e.stopPropagation();
		const value = dropdownItemValue(e);
		if (isWorkspaceRole(value) && value !== "owner") setNewRole(value);
	};

	const handleAddMember = () => {
		const email = newEmail().trim().toLowerCase();
		setMemberError(null);
		if (!email?.includes("@")) {
			setMemberError("Enter a valid email address.");
			return;
		}
		if (members().some((member) => member.email === email)) {
			setMemberError("That person is already a member.");
			return;
		}
		addMember(email, newRole());
		setNewEmail("");
		setNewRole("member");
	};

	const handleMemberRoleSelect = (memberId: string) => (e: Event) => {
		e.stopPropagation();
		const value = dropdownItemValue(e);
		if (isWorkspaceRole(value) && value !== "owner") {
			updateRole(memberId, value);
		}
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
										{profileName() ? initialsOf(profileName()) : "?"}
									</span>
									<wa-input
										style={{ "flex-grow": "1" }}
										label="Display name"
										placeholder={emailPrefix() || "Your name"}
										value={customName() ?? ""}
										onInput={(e) =>
											setCustomName(
												(e.currentTarget as HTMLInputElement).value || null,
											)
										}
									></wa-input>
								</div>
								<wa-input
									label="Email"
									value={user()?.email ?? ""}
									disabled
								></wa-input>
								<p class={dialogLabel}>
									Your display name appears on comments, assignees and the
									members list.
								</p>
							</div>
						</div>
					</Show>

					<Show when={section() === "members"}>
						<div class={dialogBody}>
							<h3 class={settingsSectionTitle}>Members</h3>
							<wa-divider style={{ "--spacing": "0" }}></wa-divider>
							<p class={dialogLabel}>
								Manage who has access to this workspace.
							</p>
							<Show
								when={canManageMembers(myRole())}
								fallback={
									<p class={dialogLabel}>
										Only owners and admins can manage members.
									</p>
								}
							>
								<div class={memberAddRow}>
									<wa-input
										style={{ "flex-grow": "1" }}
										label="Email address"
										placeholder="teammate@example.com"
										value={newEmail()}
										onInput={(e) =>
											setNewEmail((e.currentTarget as HTMLInputElement).value)
										}
										onKeyDown={(e) => {
											if (e.key === "Enter") handleAddMember();
										}}
									></wa-input>
									<wa-dropdown
										placement="bottom-start"
										on:wa-after-hide={(e) => e.stopPropagation()}
										on:wa-select={handleNewRoleSelect}
									>
										<wa-button
											type="button"
											slot="trigger"
											variant="neutral"
											appearance="outlined"
											with-caret
										>
											{ROLE_META[newRole()].label}
										</wa-button>
										<For each={ASSIGNABLE_ROLES}>
											{(role) => (
												<wa-dropdown-item value={role}>
													{ROLE_META[role].label}
												</wa-dropdown-item>
											)}
										</For>
									</wa-dropdown>
									<wa-button variant="brand" onClick={handleAddMember}>
										<wa-icon
											slot="start"
											name="user-plus"
											label="Add member"
										></wa-icon>
										Add
									</wa-button>
								</div>
								<Show when={memberError()}>
									<p
										class={dialogLabel}
										style={{ color: "var(--wa-color-danger)" }}
									>
										{memberError()}
									</p>
								</Show>
							</Show>
							<div class={settingsSection}>
								<For each={members()}>
									{(member) => (
										<div class={memberRow}>
											<span
												class={memberAvatar}
												style={{ "background-color": member.color }}
											>
												{initialsOf(member.name)}
											</span>
											<div class={memberMeta}>
												<span class={memberName}>
													{member.name}
													<Show when={member.id === CURRENT_MEMBER_ID}>
														{" "}
														(you)
													</Show>
												</span>
												<span class={memberEmail}>
													{member.email || ROLE_META[member.role].description}
												</span>
											</div>
											<Show
												when={
													member.id !== CURRENT_MEMBER_ID &&
													canModifyMember(myRole(), member.role)
												}
												fallback={
													<wa-tag appearance="outlined">
														{ROLE_META[member.role].label}
													</wa-tag>
												}
											>
												<wa-dropdown
													placement="bottom-end"
													on:wa-after-hide={(e) => e.stopPropagation()}
													on:wa-select={handleMemberRoleSelect(member.id)}
												>
													<wa-button
														type="button"
														slot="trigger"
														variant="neutral"
														appearance="outlined"
														size="s"
														with-caret
													>
														{ROLE_META[member.role].label}
													</wa-button>
													<For each={ASSIGNABLE_ROLES}>
														{(role) => (
															<wa-dropdown-item value={role}>
																{ROLE_META[role].label}
															</wa-dropdown-item>
														)}
													</For>
												</wa-dropdown>
												<DeleteButton
													label={`Remove ${member.name}`}
													iconOnly
													onDelete={() => removeMember(member.id)}
												/>
											</Show>
										</div>
									)}
								</For>
							</div>
						</div>
					</Show>

					<Show when={section() === "keyboard"}>
						<div class={dialogBody}>
							<p class={dialogLabel}>
								Keyboard shortcut configuration is a future feature. Here's a
								preview of what's coming.
							</p>
							<For each={KEYBOARD_SHORTCUTS}>
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
					<Show
						when={section() === "keyboard" || section() === "notifications"}
					>
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
