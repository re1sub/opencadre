import { createEffect, createSignal, onCleanup } from "solid-js";
import { registerRealtimeHandlers } from "#/utils/realtime/registrar";
import { supabase } from "#/utils/supabase";
import type { WorkspaceMember, WorkspaceRole } from "../types";

interface WorkspaceMemberRow {
	id?: string;
	workspace_id?: string | null;
	user_id?: string | null;
	role: string;
	email?: string | null;
}

const toMember = (m: WorkspaceMemberRow): WorkspaceMember => ({
	id: m.user_id ?? m.email ?? "",
	name: m.email || "Unknown",
	email: m.email ?? "",
	role: m.role as WorkspaceRole,
});

export function useWorkspaceMembersAdapter(workspaceId: () => string) {
	const [members, setMembers] = createSignal<WorkspaceMember[]>([]);
	const [myRole, setMyRole] = createSignal<WorkspaceRole>("member");
	const [meUserId, setMeUserId] = createSignal<string | null>(null);

	const unregister = registerRealtimeHandlers("workspace_members", {
		applyInsert: (row) => {
			const r = row as unknown as WorkspaceMemberRow;
			if (r.workspace_id !== workspaceId()) return;
			setMembers((prev) => [
				...prev.filter((m) => m.id !== toMember(r).id),
				toMember(r),
			]);
		},
		applyUpdate: (row) => {
			const r = row as unknown as WorkspaceMemberRow;
			if (r.workspace_id !== workspaceId()) return;
			const mapped = toMember(r);
			setMembers((prev) => prev.map((m) => (m.id === mapped.id ? mapped : m)));
			if (r.user_id && r.user_id === meUserId()) {
				setMyRole(r.role as WorkspaceRole);
			}
		},
		applyDelete: (row) => {
			const r = row as unknown as WorkspaceMemberRow;
			if (r.workspace_id !== workspaceId()) return;
			const mapped = toMember(r);
			setMembers((prev) => prev.filter((m) => m.id !== mapped.id));
		},
	});

	onCleanup(unregister);

	const fetchMembers = async (wsId: string) => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return;
		setMeUserId(user.id);

		const { data, error } = await supabase
			.from("workspace_members")
			.select("workspace_id, user_id, role, email")
			.eq("workspace_id", wsId);
		if (error) throw error;

		const rows = (data ?? []) as WorkspaceMemberRow[];

		const mapped: WorkspaceMember[] = rows.map((m) => ({
			id: m.user_id ?? m.email ?? "",
			name: m.email || "Unknown",
			email: m.email ?? "",
			role: m.role as WorkspaceRole,
		}));

		setMembers(mapped);

		const me = rows.find((m) => m.user_id === user.id);
		if (me) setMyRole(me.role as WorkspaceRole);
	};

	createEffect(() => {
		const wsId = workspaceId();
		if (wsId) fetchMembers(wsId);
	});

	const addMember = async (email: string, role: WorkspaceRole) => {
		const { error } = await supabase.from("workspace_members").insert({
			workspace_id: workspaceId(),
			email,
			role,
		});
		if (error) throw error;

		await fetchMembers(workspaceId());
	};

	const updateRole = async (userId: string, role: WorkspaceRole) => {
		const { error } = await supabase
			.from("workspace_members")
			.update({ role })
			.eq("workspace_id", workspaceId())
			.eq("user_id", userId);
		if (error) throw error;

		setMembers((prev) =>
			prev.map((m) => (m.id === userId ? { ...m, role } : m)),
		);

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (user?.id === userId) setMyRole(role);
	};

	const removeMember = async (userId: string) => {
		const { error } = await supabase
			.from("workspace_members")
			.delete()
			.eq("workspace_id", workspaceId())
			.eq("user_id", userId);
		if (error) throw error;

		setMembers((prev) => prev.filter((m) => m.id !== userId));
	};

	return {
		members,
		myRole,
		addMember,
		updateRole,
		removeMember,
	};
}
