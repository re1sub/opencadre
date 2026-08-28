import { createSignal } from "solid-js";
import { useAuth } from "#/features/auth/AuthContext";
import { uid } from "#/utils/uid";
import {
	CURRENT_MEMBER_ID,
	MEMBER_COLOR_POOL,
	SEED_MEMBERS,
} from "../constants/members";
import { addMemberSchema } from "../schemas";
import type { WorkspaceMember, WorkspaceRole } from "../types";
import { useProfile } from "./useProfile";

interface WorkspaceMembersStore {
	get: () => WorkspaceMember[];
	set: (
		next: WorkspaceMember[] | ((prev: WorkspaceMember[]) => WorkspaceMember[]),
	) => void;
}

const stores = new Map<string, WorkspaceMembersStore>();

let colorCursor = 1;

const nextColor = () =>
	MEMBER_COLOR_POOL[colorCursor++ % MEMBER_COLOR_POOL.length];

export function useWorkspaceMembers(workspaceId: string) {
	const { user } = useAuth();
	const { name: profileName } = useProfile(user);

	let store = stores.get(workspaceId);
	if (!store) {
		const [get, set] = createSignal<WorkspaceMember[]>(SEED_MEMBERS);
		store = { get, set };
		stores.set(workspaceId, store);
	}

	const members = () =>
		store.get().map((member) =>
			member.id === CURRENT_MEMBER_ID
				? {
						...member,
						name: profileName() || member.name,
						email: user()?.email ?? member.email,
					}
				: member,
		);

	const myRole = (): WorkspaceRole =>
		store.get().find((member) => member.id === CURRENT_MEMBER_ID)?.role ??
		"owner";

	const addMember = (email: string, role: WorkspaceRole): WorkspaceMember => {
		const parsed = addMemberSchema.shape.email.safeParse(email);
		const trimmed = (parsed.success ? parsed.data : email).trim().toLowerCase();
		const member: WorkspaceMember = {
			id: uid(),
			name: trimmed.split("@")[0],
			email: trimmed,
			role,
			color: nextColor(),
		};
		store.set((current) => [...current, member]);
		return member;
	};

	const updateRole = (memberId: string, role: WorkspaceRole): void => {
		store.set((current) =>
			current.map((member) =>
				member.id === memberId ? { ...member, role } : member,
			),
		);
	};

	const removeMember = (memberId: string): void => {
		if (memberId === CURRENT_MEMBER_ID) return;
		store.set((current) => current.filter((member) => member.id !== memberId));
	};

	return { members, myRole, addMember, updateRole, removeMember };
}
