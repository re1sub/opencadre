import { useNavigate, useSearchParams } from "@solidjs/router";
import { AuthApiError } from "@supabase/supabase-js";
import { createEffect, createSignal, Show } from "solid-js";
import { useAuth } from "#/features/auth/AuthContext";
import { logo } from "#/features/home/components/navbar.css";
import { useTheme } from "#/theme/ThemeProvider";
import {
	card,
	linkButton,
	linkButtonEnd,
	linkEnd,
	orRow,
	page,
} from "./auth.css";

type View = "signin" | "signup" | "forgot" | "reset" | "confirm";

const Auth = (props: { view?: "forgot" | "reset" }) => {
	const { theme, toggleTheme } = useTheme();
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();
	const { user, loading, login, signUp, sendPasswordReset, updatePassword } =
		useAuth();

	const [view, setView] = createSignal<View>(
		props.view === "forgot"
			? "forgot"
			: props.view === "reset"
				? "reset"
				: searchParams.register
					? "signup"
					: "signin",
	);
	const [email, setEmail] = createSignal("");
	const [password, setPassword] = createSignal("");
	const [newPassword, setNewPassword] = createSignal("");
	const [error, setError] = createSignal<string | null>(null);
	const [pending, setPending] = createSignal(false);
	const [sent, setSent] = createSignal(false);

	createEffect(() => {
		if (user() && !loading() && view() !== "reset") {
			navigate("/workspace", { replace: true });
		}
	});

	const switchMode = (e: Event, next: "signin" | "signup") => {
		e.preventDefault();
		setView(next);
		setError(null);
		setSearchParams(next === "signup" ? { register: "1" } : {}, {
			replace: true,
		});
	};

	const authenticate = async (
		email: string,
		password: string,
		action: "signin" | "signup",
	) => {
		setError(null);
		setPending(true);

		try {
			if (action === "signup") {
				const created = await signUp(email, password);
				if (!created) {
					setView("confirm");
					return;
				}
			} else {
				await login(email, password);
			}
			navigate("/workspace");
		} catch (authError: unknown) {
			if (
				authError instanceof AuthApiError &&
				authError.code === "invalid_credentials"
			) {
				setError("Email or password is incorrect.");
			} else if (authError instanceof Error) {
				setError(authError.message);
			} else {
				setError("An unexpected error occurred. Please try again.");
			}
		} finally {
			setPending(false);
		}
	};

	const handleSubmit = (event: SubmitEvent) => {
		event.preventDefault();
		void authenticate(
			email(),
			password(),
			view() === "signup" ? "signup" : "signin",
		);
	};

	const handleLocalSignIn = () => {
		void authenticate("dev@opencadre.local", "dev-password-123", "signin");
	};

	const handleForgotSubmit = (event: SubmitEvent) => {
		event.preventDefault();
		setError(null);
		setPending(true);

		sendPasswordReset(email())
			.then(() => setSent(true))
			.catch((resetError: unknown) => {
				setError(
					resetError instanceof Error
						? resetError.message
						: "An unexpected error occurred. Please try again.",
				);
			})
			.finally(() => setPending(false));
	};

	const handleResetSubmit = (event: SubmitEvent) => {
		event.preventDefault();
		setError(null);
		setPending(true);

		updatePassword(newPassword())
			.then(() => navigate("/workspace"))
			.catch((resetError: unknown) => {
				setError(
					resetError instanceof Error
						? resetError.message
						: "An unexpected error occurred. Please try again.",
				);
			})
			.finally(() => setPending(false));
	};

	const handleResend = () => {
		setError(null);
		setPending(true);

		signUp(email(), password())
			.catch((signUpError: unknown) => {
				setError(
					signUpError instanceof Error
						? signUpError.message
						: "An unexpected error occurred. Please try again.",
				);
			})
			.finally(() => setPending(false));
	};

	return (
		<main class={page}>
			<Show when={view() === "reset"}>
				<div class={card}>
					<a href="/" class={logo} style={{ "align-self": "center" }}>
						opencadre
					</a>
					<h1 style={{ "font-size": "1.5rem" }}>Reset password</h1>
					<Show when={loading()}>
						<p>Checking your reset link...</p>
					</Show>
					<Show when={!loading() && user()}>
						<form onSubmit={handleResetSubmit} style={{ display: "contents" }}>
							<wa-input
								type="password"
								label="New password"
								password-toggle
								autocomplete="new-password"
								placeholder="Enter your new password"
								required
								minlength={6}
								value={newPassword()}
								onInput={(e) =>
									setNewPassword((e.currentTarget as HTMLInputElement).value)
								}
							></wa-input>
							<Show when={error()}>
								<p style={{ color: "var(--wa-color-danger)" }}>{error()}</p>
							</Show>
							<wa-button type="submit" variant="brand" disabled={pending()}>
								{pending() ? "Updating..." : "Update password"}
							</wa-button>
						</form>
					</Show>
					<Show when={!loading() && !user()}>
						<p>This reset link is invalid or has expired.</p>
						<a
							href="/auth"
							style={{
								color: "var(--wa-color-brand)",
								"text-decoration": "underline",
							}}
						>
							Back to sign in
						</a>
					</Show>
				</div>
			</Show>

			<Show when={view() !== "reset" && !user() && !loading()}>
				<Show when={view() === "forgot"}>
					<form onSubmit={handleForgotSubmit} class={card}>
						<a href="/" class={logo} style={{ "align-self": "center" }}>
							opencadre
						</a>
						<h1 style={{ "font-size": "1.5rem" }}>Forgot password</h1>
						<Show when={!sent()}>
							<p
								style={{
									"font-size": "0.875rem",
									color: "var(--wa-color-text-quiet)",
								}}
							>
								Enter your email and we'll send you a link to reset your
								password.
							</p>
							<wa-input
								type="email"
								label="Email"
								autocomplete="email"
								placeholder="Enter your email"
								required
								value={email()}
								onInput={(e) =>
									setEmail((e.currentTarget as HTMLInputElement).value)
								}
							></wa-input>
							<Show when={error()}>
								<p style={{ color: "var(--wa-color-danger)" }}>{error()}</p>
							</Show>
							<wa-button type="submit" variant="brand" disabled={pending()}>
								{pending() ? "Sending..." : "Send reset link"}
							</wa-button>
						</Show>
						<Show when={sent()}>
							<p>
								If an account exists for {email()}, a password reset link is on
								its way.
							</p>
							<a
								href="/auth"
								style={{
									color: "var(--wa-color-brand)",
									"text-decoration": "underline",
								}}
							>
								Back to sign in
							</a>
						</Show>
					</form>
				</Show>

				<Show when={view() === "confirm"}>
					<div class={card}>
						<a href="/" class={logo} style={{ "align-self": "center" }}>
							opencadre
						</a>
						<h1 style={{ "font-size": "1.5rem" }}>Check your email</h1>
						<p>
							We sent a confirmation link to <strong>{email()}</strong>. Click
							it to confirm your account, then sign in.
						</p>
						<Show when={error()}>
							<p style={{ color: "var(--wa-color-danger)" }}>{error()}</p>
						</Show>
						<wa-button
							type="button"
							variant="brand"
							disabled={pending()}
							onClick={handleResend}
						>
							{pending() ? "Resending..." : "Resend confirmation"}
						</wa-button>
						<span>
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									setView("signin");
								}}
								class={linkButton}
							>
								Back to sign in
							</button>
						</span>
					</div>
				</Show>

				<Show when={view() === "signin" || view() === "signup"}>
					<form onSubmit={handleSubmit} class={card}>
						<a href="/" class={logo} style={{ "align-self": "center" }}>
							opencadre
						</a>
						<h1 style={{ "font-size": "1.5rem" }}>
							{view() === "signup" ? "Create your account" : "Sign in"}
						</h1>
						<wa-input
							type="email"
							label="Email"
							autocomplete="email"
							placeholder="Enter your email"
							required
							value={email()}
							onInput={(e) =>
								setEmail((e.currentTarget as HTMLInputElement).value)
							}
						></wa-input>

						<wa-input
							type="password"
							label="Password"
							password-toggle
							autocomplete={
								view() === "signup" ? "new-password" : "current-password"
							}
							placeholder="Enter your password"
							required
							minlength={6}
							value={password()}
							onInput={(e) =>
								setPassword((e.currentTarget as HTMLInputElement).value)
							}
						></wa-input>

						<Show when={error()}>
							<p style={{ color: "var(--wa-color-danger)" }}>{error()}</p>
						</Show>
						<Show when={view() === "signin"}>
							<a href="/auth/forgot-password" class={linkEnd}>
								Forgot password?
							</a>
						</Show>
						<wa-button type="submit" variant="brand" disabled={pending()}>
							{pending()
								? view() === "signup"
									? "Creating account..."
									: "Signing in..."
								: view() === "signup"
									? "Create account"
									: "Sign in"}
						</wa-button>
						<Show when={import.meta.env.DEV}>
							<wa-button
								type="button"
								variant="warning"
								disabled={pending()}
								onClick={handleLocalSignIn}
							>
								Sign in with dev account
							</wa-button>
						</Show>
						<div class={orRow}>
							<wa-divider style={{ flex: 1 }}></wa-divider>
							<small style={{ color: "var(--wa-color-text-quiet)" }}>OR</small>
							<wa-divider style={{ flex: 1 }}></wa-divider>
						</div>
						<wa-button disabled={true}>
							Sign {view() === "signup" ? "up" : "in"} with Google
						</wa-button>
						<wa-button disabled={true}>
							Sign {view() === "signup" ? "up" : "in"} with Microsoft
						</wa-button>
						<wa-divider style={{ "--spacing": "0.2rem" }}></wa-divider>
						<span>
							{view() === "signin"
								? "Don't have an account? "
								: "Already have an account? "}
							<button
								type="button"
								onClick={(e) =>
									switchMode(e, view() === "signin" ? "signup" : "signin")
								}
								class={linkButtonEnd}
							>
								{view() === "signin" ? "Sign up" : "Sign in"}
							</button>
						</span>
					</form>
				</Show>
			</Show>
			<wa-button
				variant="neutral"
				appearance="plain"
				onClick={toggleTheme}
				aria-label="Toggle theme"
				style={{
					"font-size": "1.5rem",
					position: "fixed",
					top: "0",
					right: "1rem",
				}}
			>
				<wa-icon
					name={theme() === "dark" ? "sun" : "moon"}
					label="Toggle theme"
				></wa-icon>
			</wa-button>
		</main>
	);
};

export default Auth;
