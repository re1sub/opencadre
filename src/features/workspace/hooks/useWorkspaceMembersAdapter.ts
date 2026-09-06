import { createEffect, createSignal, onCleanup } from "solid-js";
import { logActivity } from "#/utils/log";
import { registerRealtimeHandlers } from "#/utils/realtime/registrar";
import { supabase } from "#/utils/supabase";
import type { WorkspaceMember, WorkspaceRole } from "../types";

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-member`;

interface WorkspaceMemberRow {
	id?: string;
	workspace_id?: string | null;
	user_id?: string | null;
	role: string;
	email?: string | null;
	profiles?: { display_name: string | null } | null;
}

export type InviteStatus = "invited" | "added" | "already-member";

const toMember = (m: WorkspaceMemberRow): WorkspaceMember => ({
	id: m.user_id ?? m.email ?? "",
	name: m.profiles?.display_name?.trim() || m.email || "Unknown",
	email: m.email ?? "",
	role: m.role as WorkspaceRole,
});

export function useWorkspaceMembersAdapter(workspaceId: () => string) {
	const [members, setMembers] = createSignal<WorkspaceMember[]>([]);
	const [myRole, setMyRole] = createSignal<WorkspaceRole>("member");
	const [meUserId, setMeUserId] = createSignal<string | null>(null);

	// Realtime rows don't embed the profiles join, so resolve pending display
	// names via a scoped profiles lookup keyed by user_id.
	const patchMemberNameFromProfile = async (
		memberId: string,
		userId: string,
	) => {
		const { data } = await supabase
			.from("profiles")
			.select("display_name")
			.eq("id", userId)
			.maybeSingle();
		const displayName = data?.display_name?.trim();
		if (!displayName) return;
		setMembers((prev) =>
			prev.map((m) => (m.id === memberId ? { ...m, name: displayName } : m)),
		);
	};

	const unregister = registerRealtimeHandlers("workspace_members", {
		applyInsert: (row) => {
			const r = row as unknown as WorkspaceMemberRow;
			if (r.workspace_id !== workspaceId()) return;
			const mapped = toMember(r);
			setMembers((prev) => [
				...prev.filter((m) => m.id !== mapped.id && m.email !== mapped.email),
				mapped,
			]);
			if (r.user_id) patchMemberNameFromProfile(mapped.id, r.user_id);
		},
		applyUpdate: (row) => {
			const r = row as unknown as WorkspaceMemberRow;
			if (r.workspace_id !== workspaceId()) return;
			const mapped = toMember(r);
			setMembers((prev) =>
				prev.map((m) =>
					m.id === mapped.id || (m.email && m.email === mapped.email)
						? mapped
						: m,
				),
			);
			if (r.user_id) patchMemberNameFromProfile(mapped.id, r.user_id);
			if (r.user_id && r.user_id === meUserId()) {
				setMyRole(r.role as WorkspaceRole);
			}
		},
		applyDelete: (row) => {
			const r = row as unknown as WorkspaceMemberRow;
			if (r.workspace_id !== workspaceId()) return;
			const mapped = toMember(r);
			setMembers((prev) =>
				prev.filter((m) => m.id !== mapped.id && m.email !== mapped.email),
			);
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
			.select("workspace_id, user_id, role, email, profiles(display_name)")
			.eq("workspace_id", wsId);
		if (error) throw error;

		const rows = (data ?? []) as WorkspaceMemberRow[];

		const mapped: WorkspaceMember[] = rows.map(toMember);

		setMembers(mapped);

		const me = rows.find((m) => m.user_id === user.id);
		if (me) setMyRole(me.role as WorkspaceRole);
	};

	createEffect(() => {
		const wsId = workspaceId();
		if (wsId) fetchMembers(wsId);
	});

	const inviteMember = async (
		email: string,
		role: "admin" | "member" | "guest",
	): Promise<InviteStatus> => {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		const token = session?.access_token ?? "";

		const response = await fetch(EDGE_FUNCTION_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				workspace_id: workspaceId(),
				email,
				role,
			}),
		});

		const payload = (await response.json().catch(() => null)) as {
			status?: InviteStatus;
		} | null;

		if (!response.ok || !payload?.status) {
			const message =
				response.status === 403
					? "You don't have permission to invite members."
					: response.status === 409
						? "That person is already a member."
						: "Failed to send the invite. Please try again.";
			throw new Error(message);
		}

		await fetchMembers(workspaceId());
		await logActivity(workspaceId(), "member", null, "member_invite", {
			email,
			role,
		});
		return payload.status;
	};

	const updateRole = async (memberId: string, role: WorkspaceRole) => {
		const isEmail = memberId.includes("@");
		let query = supabase
			.from("workspace_members")
			.update({ role })
			.eq("workspace_id", workspaceId());
		query = isEmail
			? query.eq("email", memberId)
			: query.eq("user_id", memberId);
		const { error } = await query;
		if (error) throw error;

		await logActivity(workspaceId(), "member", memberId, "member_role_update", {
			role,
		});

		setMembers((prev) =>
			prev.map((m) => (m.id === memberId ? { ...m, role } : m)),
		);

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (user?.id === memberId) setMyRole(role);
		if (isEmail) await fetchMembers(workspaceId());
	};

	const removeMember = async (memberId: string) => {
		const isEmail = memberId.includes("@");
		let query = supabase
			.from("workspace_members")
			.delete()
			.eq("workspace_id", workspaceId());
		query = isEmail
			? query.eq("email", memberId)
			: query.eq("user_id", memberId);
		const { error } = await query;
		if (error) throw error;

		await logActivity(workspaceId(), "member", memberId, "member_remove");

		setMembers((prev) => prev.filter((m) => m.id !== memberId));
	};

	return {
		members,
		myRole,
		inviteMember,
		updateRole,
		removeMember,
	};
}
