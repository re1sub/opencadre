import { useNavigate, useSearchParams } from "@solidjs/router";
import { createSignal, Show } from "solid-js";
import { supabase } from "#/utils/supabase";

export function Auth() {
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();

	const [mode, setMode] = createSignal(
		searchParams.register ? "signup" : "signin",
	);
	const [email, setEmail] = createSignal("");
	const [password, setPassword] = createSignal("");
	const [error, setError] = createSignal<string | null>(null);
	const [pending, setPending] = createSignal(false);

	const switchMode = (next: "signin" | "signup") => {
		setMode(next);
		setError(null);
		setSearchParams(next === "signup" ? { register: "1" } : {}, {
			replace: true,
		});
	};

	const handleSubmit = async (event: SubmitEvent) => {
		event.preventDefault();
		setError(null);
		setPending(true);

		const { error } =
			mode() === "signup"
				? await supabase.auth.signUp({ email: email(), password: password() })
				: await supabase.auth.signInWithPassword({
						email: email(),
						password: password(),
					});

		setPending(false);
		if (error) {
			setError(error.message);
			return;
		}
		navigate("/dashboard");
	};

	return (
		<main style={{ padding: "2rem" }}>
			<h1>{mode() === "signup" ? "Create your account" : "Sign in"}</h1>

			<div style={{ margin: "0.5rem 0" }}>
				<wa-button-group label="Auth mode">
					<wa-button
						variant={mode() === "signin" ? "brand" : "neutral"}
						onClick={() => switchMode("signin")}
					>
						Sign in
					</wa-button>
					<wa-button
						variant={mode() === "signup" ? "brand" : "neutral"}
						onClick={() => switchMode("signup")}
					>
						Sign up
					</wa-button>
				</wa-button-group>
			</div>

			<form onSubmit={handleSubmit} style={{ "max-width": "24rem" }}>
				<wa-input
					type="email"
					label="Email"
					autocomplete="email"
					required
					value={email()}
					onInput={(event) =>
						setEmail((event.currentTarget as HTMLInputElement).value)
					}
				/>

				<wa-input
					type="password"
					label="Password"
					password-toggle
					autocomplete={
						mode() === "signup" ? "new-password" : "current-password"
					}
					required
					minlength={6}
					value={password()}
					onInput={(event) =>
						setPassword((event.currentTarget as HTMLInputElement).value)
					}
				/>

				<Show when={error()}>
					<p style={{ color: "var(--wa-color-danger)" }}>{error()}</p>
				</Show>
				<wa-button
					type="button"
					href="/"
					variant="neutral"
					style={{ "margin-right": "0.5rem" }}
				>
					{" < "} Back
				</wa-button>

				<wa-button
					type="submit"
					variant="brand"
					disabled={pending()}
					style={{ "margin-top": "1rem" }}
				>
					{pending()
						? mode() === "signup"
							? "Creating account..."
							: "Signing in..."
						: mode() === "signup"
							? "Create account"
							: "Sign in"}
				</wa-button>
			</form>
		</main>
	);
}
