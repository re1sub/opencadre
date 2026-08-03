import { Navigate } from "@solidjs/router";
import type { ParentComponent } from "solid-js";
import { Show } from "solid-js";
import { useAuth } from "#/contexts/AuthContext";

export const RequireAuth: ParentComponent = (props) => {
	const { user, loading } = useAuth();

	return (
		<Show when={!loading() && user()} fallback={<Navigate href="/auth" />}>
			{props.children}
		</Show>
	);
};
