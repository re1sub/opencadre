import { useNavigate } from "@solidjs/router";
import { createSignal, onCleanup, Show } from "solid-js";
import { supabase } from "#/utils/supabase";

export function Dashboard() {
	const navigate = useNavigate();
	const [user, setUser] = createSignal<string | null>(null);

	const {
		data: { subscription },
	} = supabase.auth.onAuthStateChange((_event, session) => {
		setUser(session?.user.email ?? null);
	});

	onCleanup(() => subscription.unsubscribe());

	void supabase.auth.getSession().then(({ data }) => {
		setUser(data.session?.user.email ?? null);
	});

	const handleSignOut = async () => {
		await supabase.auth.signOut();
		navigate("/auth");
	};

	return (
		<main style={{ padding: "2rem", "font-family": "sans-serif" }}>
			<h1>Dashboard</h1>
			<Show
				when={user()}
				fallback={
					<p>
						Not signed in. <a href="/auth">Sign in</a>
					</p>
				}
			>
				{(email) => (
					<>
						<p>Signed in as {email()}</p>
						<wa-button variant="neutral" onClick={handleSignOut}>
							Sign out
						</wa-button>
					</>
				)}
			</Show>
		</main>
	);
}
