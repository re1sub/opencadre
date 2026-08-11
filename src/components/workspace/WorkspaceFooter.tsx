import type { User } from "@supabase/supabase-js";
import { Show } from "solid-js";
import { navFooter } from "./workspace.css";

interface WorkspaceFooterProps {
	user: () => User | null;
	error: () => string | null;
	onSignOut: () => void;
}

export function WorkspaceFooter(props: WorkspaceFooterProps) {
	return (
		<nav slot="navigation-footer" class={navFooter}>
			<Show when={props.user()} fallback={null}>
				{(email) => (
					<>
						<p>Signed in as {email().email}</p>

						<Show when={props.error()}>
							<p style={{ color: "var(--wa-color-danger)" }}>{props.error()}</p>
						</Show>

						<wa-button
							variant="neutral"
							appearance="plain"
							onClick={props.onSignOut}
						>
							<wa-icon name="log-out" slot="start"></wa-icon>
							Sign out
						</wa-button>
					</>
				)}
			</Show>
		</nav>
	);
}
