import { createSignal, Show } from "solid-js";
import { useAuth } from "#/contexts/AuthContext";

export function Workspace() {
	const { user, logout } = useAuth();
	const [error, setError] = createSignal<string | null>(null);

	const handleSignOut = async () => {
		setError(null);

		try {
			await logout();
		} catch (authError: unknown) {
			setError(
				authError instanceof Error
					? authError.message
					: "An unexpected error occurred. Please try again.",
			);
		}
	};

	return (
		<main style={{ padding: "2rem", "font-family": "sans-serif" }}>
			<h1>Workspace</h1>
			<Show when={user()} fallback={null}>
				{(email) => (
					<>
						<p>Signed in as {email().email}</p>
						<Show when={error()}>
							<p style={{ color: "var(--wa-color-danger)" }}>{error()}</p>
						</Show>
						<wa-button variant="neutral" onClick={handleSignOut}>
							Sign out
						</wa-button>
					</>
				)}
			</Show>
		</main>
	);
}
