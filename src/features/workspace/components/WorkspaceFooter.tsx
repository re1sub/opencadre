import type { User } from "@supabase/supabase-js";
import { createSignal, Show } from "solid-js";
import AddAccountDialog from "./AddAccountDialog";
import AddMembersDialog from "./AddMembersDialog";
import SettingsDialog from "./SettingsDialog";
import { navFooter, userMenuName, userMenuTrigger } from "./workspace.css";

interface WorkspaceFooterProps {
	user: () => User | null;
	error: () => string | null;
	onSignOut: () => void;
	onOpenTrash: () => void;
}

const WorkspaceFooter = (props: WorkspaceFooterProps) => {
	const [showSettings, setShowSettings] = createSignal(false);
	const [showAddMembers, setShowAddMembers] = createSignal(false);
	const [showAddAccount, setShowAddAccount] = createSignal(false);

	const displayName = () => {
		const user = props.user();
		if (!user) return "";
		return user.email ?? "";
	};

	const initials = () => {
		const name = displayName();
		return name ? name.slice(0, 2).toUpperCase() : "?";
	};

	const handleSelect = (e: Event) => {
		const selectEvent = e as unknown as {
			detail: { item: { value?: string } | null };
		};

		const value = selectEvent.detail.item?.value;

		if (value === "__signout__") props.onSignOut();
		else if (value === "__settings__") setShowSettings(true);
		else if (value === "__members__") setShowAddMembers(true);
		else if (value === "__account__") setShowAddAccount(true);
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
						<wa-icon slot="icon" name="users" label="Add members"></wa-icon>
						Add members
					</wa-dropdown-item>

					<wa-dropdown-item value="__account__">
						<wa-icon slot="icon" name="user-plus" label="Add account"></wa-icon>
						Add account
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
				<SettingsDialog onClose={() => setShowSettings(false)} />
			</Show>

			<Show when={showAddMembers()}>
				<AddMembersDialog onClose={() => setShowAddMembers(false)} />
			</Show>

			<Show when={showAddAccount()}>
				<AddAccountDialog onClose={() => setShowAddAccount(false)} />
			</Show>
		</nav>
	);
};

export default WorkspaceFooter;
