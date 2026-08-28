import { createSignal, For, Show } from "solid-js";
import { useAuth } from "#/features/auth/AuthContext";
import ConfirmDialog from "#/features/ui/ConfirmDialog";
import DeleteButton from "#/features/ui/DeleteButton";
import { getInitials } from "#/utils/initials";
import { supabase } from "#/utils/supabase";
import { useDialog } from "#/utils/useDialog";
import { type ThemePreference, useTheme } from "#theme/ThemeProvider";
import { CURRENT_MEMBER_ID } from "../constants/members";
import {
	ASSIGNABLE_ROLES,
	canDeleteWorkspace,
	canManageMembers,
	canModifyMember,
	canRenameWorkspace,
	isWorkspaceRole,
	ROLE_META,
} from "../constants/roles";
import { useProfile } from "../hooks/useProfile";
import { useWorkspaceMembersAdapter } from "../hooks/useWorkspaceMembersAdapter";
import { addMemberSchema } from "../schemas";
import {
	PAGE_KIND_META,
	type PageKind,
	type Workspace,
	type WorkspaceRole,
} from "../types";
import {
	dangerZone,
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
	workspaceDangerRow,
} from "./workspace.css";

export type SettingsSection =
	| "general"
	| "workspace"
	| "members"
	| "keyboard"
	| "notifications";

interface SettingsDialogProps {
	workspaceId: string;
	workspace: () => Workspace | null;
	initialSection?: SettingsSection;
	onUpdateWorkspace: (
		id: string,
		fields: {
			name?: string;
			description?: string | null;
			defaultPageKind?: PageKind;
		},
	) => void;
	onDeleteWorkspace: (id: string) => void;
	onLeaveWorkspace: (id: string) => void;
	onClose: () => void;
}

const SECTIONS: {
	value: SettingsSection;
	label: string;
	icon: string;
}[] = [
	{ value: "general", label: "General", icon: "settings" },
	{ value: "workspace", label: "Workspace", icon: "briefcase" },
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
	const { name: profileName, setCustomName } = useProfile(user);
	const { members, myRole, addMember, updateRole, removeMember } =
		useWorkspaceMembersAdapter(() => props.workspaceId);

	const [section, setSection] = createSignal<SettingsSection>(
		props.initialSection ?? "general",
	);
	const [panelOpen, setPanelOpen] = createSignal(Boolean(props.initialSection));

	const [nameDraft, setNameDraft] = createSignal<string | null>(null);
	const [newEmail, setNewEmail] = createSignal("");
	const [newRole, setNewRole] = createSignal<WorkspaceRole>("member");
	const [memberError, setMemberError] = createSignal<string | null>(null);
	const [wsNameDraft, setWsNameDraft] = createSignal<string | null>(null);
	const [wsDescriptionDraft, setWsDescriptionDraft] = createSignal<
		string | null
	>(null);
	const [confirmAction, setConfirmAction] = createSignal<
		"delete" | "leave" | null
	>(null);

	const currentTheme = () =>
		THEME_PREFERENCES.find((option) => option.value === themePreference()) ??
		THEME_PREFERENCES[0];

	const emailPrefix = () => {
		const email = user()?.email;
		return email ? email.split("@")[0] : "";
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

	const wsNameValue = () => wsNameDraft() ?? props.workspace()?.name ?? "";

	const wsDescriptionValue = () =>
		wsDescriptionDraft() ?? props.workspace()?.description ?? "";

	const currentDefaultKind = () => {
		const kind = props.workspace()?.defaultPageKind ?? "markdown";
		return PAGE_KIND_META[kind];
	};

	const handleWsNameInput = (e: Event) => {
		setWsNameDraft((e.currentTarget as HTMLInputElement).value);
	};

	const handleWsNameCommit = () => {
		const ws = props.workspace();
		const next = (wsNameDraft() ?? "").trim();
		setWsNameDraft(null);
		if (ws && next && next !== ws.name)
			props.onUpdateWorkspace(ws.id, { name: next });
	};

	const handleWsDescriptionInput = (e: Event) => {
		setWsDescriptionDraft((e.currentTarget as HTMLInputElement).value);
	};

	const handleWsDescriptionCommit = () => {
		const ws = props.workspace();
		const next = (wsDescriptionDraft() ?? "").trim();
		setWsDescriptionDraft(null);
		if (ws && next !== (ws.description ?? "")) {
			props.onUpdateWorkspace(ws.id, { description: next || null });
		}
	};

	const handleDefaultKindSelect = (e: Event) => {
		const ws = props.workspace();
		const value = dropdownItemValue(e) as PageKind | undefined;
		if (ws && value && PAGE_KIND_META[value]) {
			props.onUpdateWorkspace(ws.id, { defaultPageKind: value });
		}
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
		setMemberError(null);

		const result = addMemberSchema.safeParse({
			email: newEmail(),
			role: newRole(),
		});
		if (!result.success) {
			setMemberError(result.error.issues[0].message);
			return;
		}

		const email = result.data.email.toLowerCase();
		if (members().some((member) => member.email === email)) {
			setMemberError("That person is already a member.");
			return;
		}
		addMember(email, result.data.role);
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
										{profileName() ? getInitials(profileName()) : "?"}
									</span>
									<wa-input
										style={{ "flex-grow": "1" }}
										label="Display name"
										placeholder={emailPrefix() || "Your name"}
										value={displayNameValue()}
										onInput={handleDisplayNameInput}
										onChange={handleDisplayNameCommit}
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

					<Show when={section() === "workspace"}>
						<Show
							when={props.workspace()}
							fallback={
								<div class={dialogBody}>
									<p class={dialogLabel}>
										Open a workspace to manage its settings.
									</p>
								</div>
							}
						>
							<div class={dialogBody}>
								<h3 class={settingsSectionTitle}>Workspace</h3>
								<wa-divider style={{ "--spacing": "0" }}></wa-divider>
								<div class={settingsSection}>
									<wa-input
										label="Workspace name"
										value={wsNameValue()}
										onInput={handleWsNameInput}
										onChange={handleWsNameCommit}
										disabled={!canRenameWorkspace(myRole())}
									></wa-input>
									<wa-input
										label="Description"
										placeholder="What is this workspace for?"
										value={wsDescriptionValue()}
										onInput={handleWsDescriptionInput}
										onChange={handleWsDescriptionCommit}
										disabled={!canRenameWorkspace(myRole())}
									></wa-input>
									<p class={dialogLabel}>
										Choose the page kind created by the "Add page" button in the
										sidebar.
									</p>
									<wa-dropdown
										placement="bottom-start"
										on:wa-after-hide={(e) => e.stopPropagation()}
										on:wa-select={handleDefaultKindSelect}
									>
										<wa-button
											type="button"
											slot="trigger"
											variant="neutral"
											appearance="outlined"
											with-caret
											style={{ width: "fit-content" }}
											disabled={!canRenameWorkspace(myRole())}
										>
											<wa-icon
												slot="start"
												name={currentDefaultKind().icon}
												label={currentDefaultKind().iconLabel}
											></wa-icon>
											{currentDefaultKind().label}
										</wa-button>
										<For each={Object.entries(PAGE_KIND_META)}>
											{([kind, meta]) => (
												<wa-dropdown-item value={kind}>
													<wa-icon
														slot="icon"
														name={meta.icon}
														label={meta.iconLabel}
													></wa-icon>
													{meta.label}
												</wa-dropdown-item>
											)}
										</For>
									</wa-dropdown>
								</div>

								<h3 class={settingsSectionTitle}>Export</h3>
								<wa-divider style={{ "--spacing": "0" }}></wa-divider>
								<div class={settingsSection}>
									<p class={dialogLabel}>
										Import and export are planned. Here's a preview of what's
										coming.
									</p>
									<div
										style={{
											display: "flex",
											"flex-wrap": "wrap",
											gap: "var(--wa-space-s)",
											"align-items": "center",
										}}
									>
										<wa-button
											type="button"
											variant="neutral"
											appearance="outlined"
											disabled
										>
											<wa-icon
												slot="start"
												name="download"
												label="Export"
											></wa-icon>
											Export as Markdown
										</wa-button>
										<wa-button
											type="button"
											variant="neutral"
											appearance="outlined"
											disabled
										>
											<wa-icon
												slot="start"
												name="file-json"
												label="Export"
											></wa-icon>
											Export as JSON
										</wa-button>
										<wa-tag variant="warning">Planned</wa-tag>
									</div>
								</div>

								<h3 class={settingsSectionTitle}>Danger zone</h3>
								<wa-divider style={{ "--spacing": "0" }}></wa-divider>
								<div class={`${settingsSection} ${dangerZone}`}>
									<div class={workspaceDangerRow}>
										<div class={memberMeta}>
											<span class={memberName}>Delete workspace</span>
											<span class={memberEmail}>
												Permanently delete
												{" " + (props.workspace()?.name ?? "this workspace")}{" "}
												and all of its pages. This cannot be undone.
											</span>
										</div>
										<wa-button
											type="button"
											variant="danger"
											appearance="outlined"
											size="s"
											disabled={!canDeleteWorkspace(myRole())}
											onClick={() => setConfirmAction("delete")}
										>
											Delete
										</wa-button>
									</div>
									<div class={workspaceDangerRow}>
										<div class={memberMeta}>
											<span class={memberName}>Leave workspace</span>
											<span class={memberEmail}>
												{myRole() === "owner"
													? "You own this workspace. Transfer ownership to another member to leave."
													: "Remove yourself from this workspace and lose access to its pages."}
											</span>
										</div>
										<wa-button
											type="button"
											variant="neutral"
											appearance="outlined"
											size="s"
											disabled={myRole() === "owner"}
											onClick={() => setConfirmAction("leave")}
										>
											Leave
										</wa-button>
									</div>
								</div>

								<Show when={confirmAction() === "delete"}>
									<ConfirmDialog
										label="Delete workspace"
										message={`Permanently delete "${props.workspace()?.name ?? "this workspace"}" and all of its pages? This cannot be undone.`}
										onConfirm={() => {
											const ws = props.workspace();
											if (ws) props.onDeleteWorkspace(ws.id);
										}}
										onClose={() => setConfirmAction(null)}
									/>
								</Show>
								<Show when={confirmAction() === "leave"}>
									<ConfirmDialog
										label="Leave workspace"
										message={`Leave "${props.workspace()?.name ?? "this workspace"}"? You will lose access to its pages.`}
										onConfirm={() => {
											const ws = props.workspace();
											if (ws) props.onLeaveWorkspace(ws.id);
										}}
										onClose={() => setConfirmAction(null)}
									/>
								</Show>
							</div>
						</Show>
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
												{getInitials(member.name)}
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
