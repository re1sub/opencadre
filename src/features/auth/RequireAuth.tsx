import { Navigate } from "@solidjs/router";
import type { ParentComponent } from "solid-js";
import { Show } from "solid-js";
import { useAuth } from "#/features/auth/AuthContext";

const RequireAuth: ParentComponent = (props) => {
	const { user, loading } = useAuth();

	return (
		<Show
			when={!loading() && user()}
			fallback={
				<Show when={!loading() && !user()}>
					<Navigate href="/auth" />
				</Show>
			}
		>
			{props.children}
		</Show>
	);
};
export default RequireAuth;
