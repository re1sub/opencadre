import type { RealtimeChannel } from "@supabase/supabase-js";
import { createEffect, onCleanup } from "solid-js";
import { supabase } from "#/utils/supabase";
import { dispatchRealtimeEvent } from "./registrar";

interface UseWorkspaceRealtimeOptions {
	workspaceId: () => string;
	/** Page ids that belong to the current workspace (used to scope page-level
	 * tables that carry `page_id` but not `workspace_id`). */
	getPageIds: () => string[];
}

/**
 * Opens a single workspace-scoped Realtime channel and routes Postgres change
 * events for all hot tables to the registered adapter handlers (see
 * `registerRealtimeHandlers`).
 *
 * Author-echo suppression is handled at the adapter layer via the reconcile
 * guard; authorization is enforced by Supabase RLS SELECT policies, so a user
 * only ever receives rows they're allowed to see.
 */
export function useWorkspaceRealtime(options: UseWorkspaceRealtimeOptions) {
	createEffect(() => {
		const wsId = options.workspaceId();
		if (!wsId) return;

		const channel: RealtimeChannel = supabase.channel(
			`workspace-realtime:${wsId}`,
		);

		const subscribe = (table: string, extraFilter?: string) => {
			const filter = extraFilter ?? undefined;
			channel.on(
				"postgres_changes",
				{ event: "*", schema: "public", table, filter },
				(payload) => {
					if (!isWithinWorkspace(payload.table, payload.new, payload.old)) {
						return;
					}
					dispatchRealtimeEvent(payload);
				},
			);
		};

		const isWithinWorkspace = (
			table: string,
			newRow?: Record<string, unknown> | null,
			oldRow?: Record<string, unknown> | null,
		): boolean => {
			const row = newRow ?? oldRow;
			if (!row) return false;

			switch (table) {
				case "workspaces":
					return row.id === wsId;
				case "pages":
				case "tags":
				case "workspace_members":
					return row.workspace_id === wsId;
				case "user_settings":
					return true;
				case "page_content":
				case "comment_threads":
					return (
						typeof row.page_id === "string" &&
						options.getPageIds().includes(row.page_id)
					);
				case "comments":
					// carries thread_id, not page_id; the owning adapter scopes
					// it against its known threads.
					return true;
				default:
					return true;
			}
		};

		// Workspace-scoped tables filterable server-side.
		subscribe("pages", `workspace_id=eq.${wsId}`);
		subscribe("tags", `workspace_id=eq.${wsId}`);
		subscribe("workspace_members", `workspace_id=eq.${wsId}`);
		subscribe("workspaces");
		subscribe("user_settings");

		// Page-scoped tables: subscribed without filter, guarded client-side.
		subscribe("page_content");
		subscribe("comment_threads");
		subscribe("comments");

		channel.subscribe();

		onCleanup(() => {
			channel.unsubscribe();
		});
	});
}
