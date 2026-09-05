import type { User } from "@supabase/supabase-js";
import { createSignal, Show } from "solid-js";
import { dropdownItemValue, getInitials } from "#/utils/misc";
import { useHotkey } from "#/utils/useHotkey";
import { useProfile } from "../hooks/useProfile";
import { useShortcuts } from "../hooks/useShortcuts";
import type { Page, PageKind, Workspace } from "../types";
import type { SettingsSection } from "./SettingsDialog";
import SettingsDialog from "./SettingsDialog";
import { navFooter, userMenuName, userMenuTrigger } from "./workspace.css";

interface WorkspaceFooterProps {
	user: () => User | null;
	error: () => string | null;
	workspace: () => Workspace | null;
	onSignOut: () => void;
	onOpenTrash: () => void;
	onUpdateWorkspace: (
		id: string,
		fields: {
			name?: string;
			description?: string | null;
			defaultPageKind?: PageKind;
		},
	) => void;
	onAddPage: (
		kind: PageKind,
		opts?: { title?: string; content?: string },
	) => Promise<Page>;
	onDeleteWorkspace: (id: string) => void;
	onLeaveWorkspace: (id: string) => void;
	pages: () => Page[];
}

const WorkspaceFooter = (props: WorkspaceFooterProps) => {
	const [showSettings, setShowSettings] = createSignal(false);
	const [settingsSection, setSettingsSection] = createSignal<SettingsSection>();

	const { name } = useProfile(props.user);

	const displayName = () => name();

	const initials = () => getInitials(displayName()) || "?";

	const openSettings = (section?: SettingsSection) => {
		setSettingsSection(section);
		setShowSettings(true);
	};

	const { shortcuts } = useShortcuts();
	useHotkey(
		() => {
			const config = shortcuts()["open-settings"];
			return config.enabled ? config.combo : null;
		},
		() => openSettings(),
	);

	const handleSelect = (e: Event) => {
		const value = dropdownItemValue(e);

		if (value === "__signout__") props.onSignOut();
		else if (value === "__settings__") openSettings();
		else if (value === "__members__") openSettings("members");
		else if (value === "__trash__") props.onOpenTrash();
	};

	return (
		<nav slot="navigation-footer" class={navFooter}>
			<Show when={props.user()} fallback={null}>
				<wa-dropdown placement="top-start" on:wa-select={handleSelect}>
					<wa-button
						type="button"
						slot="trigger"
						variant="neutral"
						appearance="plain"
						with-caret
						class={userMenuTrigger}
					>
						<wa-avatar
							initials={initials()}
							label={displayName()}
							slot="start"
							style={{ "--size": "2rem" }}
						></wa-avatar>
						<span class={userMenuName}>{displayName()}</span>
					</wa-button>

					<wa-dropdown-item value="__members__">
						<wa-icon slot="icon" name="users" label="Members"></wa-icon>
						Members
					</wa-dropdown-item>

					<wa-divider></wa-divider>

					<wa-dropdown-item value="__settings__">
						<wa-icon slot="icon" name="settings" label="Settings"></wa-icon>
						Settings
					</wa-dropdown-item>

					<wa-dropdown-item value="__trash__">
						<wa-icon slot="icon" name="trash-2" label="Trash"></wa-icon>
						Trash
					</wa-dropdown-item>

					<wa-divider></wa-divider>

					<wa-dropdown-item value="__signout__">
						<wa-icon slot="icon" name="log-out" label="Sign out"></wa-icon>
						Sign out
					</wa-dropdown-item>
				</wa-dropdown>
			</Show>

			<Show when={props.error()}>
				<p style={{ color: "var(--wa-color-danger)" }}>{props.error()}</p>
			</Show>

			<Show when={showSettings()}>
				<SettingsDialog
					workspace={props.workspace}
					workspaceId={props.workspace()?.id ?? ""}
					pages={props.pages}
					initialSection={settingsSection()}
					onUpdateWorkspace={props.onUpdateWorkspace}
					onAddPage={props.onAddPage}
					onDeleteWorkspace={props.onDeleteWorkspace}
					onLeaveWorkspace={props.onLeaveWorkspace}
					onClose={() => {
						setShowSettings(false);
						setSettingsSection(undefined);
					}}
				/>
			</Show>
		</nav>
	);
};

export default WorkspaceFooter;
