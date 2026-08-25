import type { WorkspaceRole } from "../types";

export const ASSIGNABLE_ROLES: WorkspaceRole[] = ["admin", "member", "guest"];

export const ROLE_META: Record<
	WorkspaceRole,
	{ label: string; description: string }
> = {
	owner: {
		label: "Owner",
		description: "Full control, can transfer or delete the workspace.",
	},
	admin: {
		label: "Admin",
		description: "Can invite and manage members, delete pages, purge trash.",
	},
	member: {
		label: "Member",
		description: "Can create and edit pages, set due dates and assignees.",
	},
	guest: {
		label: "Guest",
		description: "Read-only access to pages.",
	},
};

export const isWorkspaceRole = (
	value: string | undefined,
): value is WorkspaceRole =>
	value === "owner" ||
	value === "admin" ||
	value === "member" ||
	value === "guest";

export const canEditContent = (role: WorkspaceRole): boolean =>
	role !== "guest";

export const canCreatePages = (role: WorkspaceRole): boolean =>
	role !== "guest";

export const canDeletePages = (role: WorkspaceRole): boolean =>
	role === "owner" || role === "admin";

export const canManageMembers = (role: WorkspaceRole): boolean =>
	role === "owner" || role === "admin";

export const canModifyMember = (
	actorRole: WorkspaceRole,
	targetRole: WorkspaceRole,
): boolean => {
	if (!canManageMembers(actorRole)) return false;
	if (targetRole === "owner") return false;
	return true;
};

export const canRenameWorkspace = (role: WorkspaceRole): boolean =>
	role === "owner";

export const canDeleteWorkspace = (role: WorkspaceRole): boolean =>
	role === "owner";
