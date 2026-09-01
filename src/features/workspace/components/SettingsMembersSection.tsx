import { createSignal, For, Show } from "solid-js";
import DeleteButton from "#/features/ui/DeleteButton";
import { dropdownItemValue, getInitials } from "#/utils/misc";
import { CURRENT_MEMBER_ID } from "../constants/members";
import {
	ASSIGNABLE_ROLES,
	canManageMembers,
	canModifyMember,
	isWorkspaceRole,
	ROLE_META,
} from "../constants/roles";
import { useWorkspaceMembersAdapter } from "../hooks/useWorkspaceMembersAdapter";
import { addMemberSchema } from "../schemas";
import type { WorkspaceRole } from "../types";
import {
	dialogBody,
	dialogLabel,
	memberAddRow,
	memberAvatar,
	memberEmail,
	memberMeta,
	memberName,
	memberRow,
	settingsSection,
	settingsSectionTitle,
} from "./workspace.css";

interface SettingsMembersSectionProps {
	workspaceId: string;
}

const SettingsMembersSection = (props: SettingsMembersSectionProps) => {
	const { members, myRole, addMember, updateRole, removeMember } =
		useWorkspaceMembersAdapter(() => props.workspaceId);

	const [newEmail, setNewEmail] = createSignal("");
	const [newRole, setNewRole] = createSignal<WorkspaceRole>("member");
	const [memberError, setMemberError] = createSignal<string | null>(null);

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
		<div class={dialogBody}>
			<h3 class={settingsSectionTitle}>Members</h3>
			<wa-divider style={{ "--spacing": "0" }}></wa-divider>
			<p class={dialogLabel}>Manage who has access to this workspace.</p>
			<Show
				when={canManageMembers(myRole())}
				fallback={
					<p class={dialogLabel}>Only owners and admins can manage members.</p>
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
						<wa-icon slot="start" name="user-plus" label="Add member"></wa-icon>
						Add
					</wa-button>
				</div>
				<Show when={memberError()}>
					<p class={dialogLabel} style={{ color: "var(--wa-color-danger)" }}>
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
									<Show when={member.id === CURRENT_MEMBER_ID}> (you)</Show>
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
	);
};

export default SettingsMembersSection;
