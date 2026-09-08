import { Navigate, useNavigate, useSearchParams } from "@solidjs/router";
import { createEffect, createSignal, Show } from "solid-js";
import { useAuth } from "#/features/auth/AuthContext";
import { supabase } from "#/utils/supabase";

type InviteDetails = {
	workspace_id: string;
	workspace_name: string;
	email: string;
	role: string;
};

const AcceptInvite = () => {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { user, loading: authLoading } = useAuth();
	const [invite, setInvite] = createSignal<InviteDetails | null>(null);
	const [inviteLoading, setInviteLoading] = createSignal(true);
	const [inviteError, setInviteError] = createSignal(false);
	const [acceptStatus, setAcceptStatus] = createSignal<
		"idle" | "pending" | "ok" | "error"
	>("idle");
	const [acceptError, setAcceptError] = createSignal<string | null>(null);

	const token = () => {
		const t = searchParams.token;
		return typeof t === "string" && t ? t : null;
	};

	createEffect(() => {
		const t = token();
		if (!t) {
			setInviteLoading(false);
			setInviteError(true);
			return;
		}
		setInviteLoading(true);
		setInviteError(false);
		(async () => {
			const { data, error } = await supabase.rpc("get_invite_details", {
				p_token: t,
			});
			if (error || !data || (Array.isArray(data) && data.length === 0)) {
				setInvite(null);
				setInviteError(true);
				setInviteLoading(false);
				return;
			}
			const row = Array.isArray(data) ? data[0] : data;
			setInvite(row as InviteDetails);
			setInviteLoading(false);
		})();
	});

	createEffect(() => {
		if (authLoading() || inviteLoading()) return;
		const t = token();
		const u = user();
		const inv = invite();
		if (!t || !inv) return;
		if (!u) return;
		if (acceptStatus() !== "idle") return;
		setAcceptStatus("pending");
		(async () => {
			const { data, error } = await supabase.rpc("accept_invite", { token: t });
			if (error || !data) {
				const msg = error?.message ?? "";
				if (msg.toLowerCase().includes("email")) {
					setAcceptError(
						`This invite was sent to ${inv.email}, but you're signed in as ${u.email}. Please sign out and sign in with the correct account.`,
					);
				} else {
					setAcceptError(null);
				}
				setAcceptStatus("error");
				return;
			}
			setAcceptStatus("ok");
		})();
	});

	const goAuth = (mode: "signin" | "signup") => {
		const t = token();
		const qs = new URLSearchParams();
		if (t) qs.set("invite_token", t);
		const query = qs.toString() ? `?${qs.toString()}` : "";
		navigate(
			mode === "signup" ? `/auth/signup${query}` : `/auth/signin${query}`,
		);
	};

	return (
		<Show
			when={!inviteLoading() && !authLoading()}
			fallback={
				<div style={{ padding: "var(--wa-space-xl)", "text-align": "center" }}>
					<p style={{ margin: "0" }}>Loading invite…</p>
				</div>
			}
		>
			<Show
				when={token() && !inviteError() && invite()}
				fallback={
					<div
						style={{ padding: "var(--wa-space-xl)", "text-align": "center" }}
					>
						<p style={{ margin: "0" }}>
							This invite link is invalid or has already been used.
						</p>
						<wa-button
							style={{ margin: "var(--wa-space-m)" }}
							onClick={() => navigate("/")}
						>
							Go home
						</wa-button>
					</div>
				}
			>
				<Show when={user()}>
					<Show
						when={acceptStatus() !== "error"}
						fallback={
							<div
								style={{
									padding: "var(--wa-space-xl)",
									"text-align": "center",
								}}
							>
								<p style={{ margin: "0" }}>
									{acceptError() ??
										"This invite link is invalid or has already been used."}
								</p>
								<div
									style={{
										display: "flex",
										gap: "var(--wa-space-m)",
										"justify-content": "center",
										"margin-top": "var(--wa-space-m)",
									}}
								>
									<wa-button
										variant="neutral"
										appearance="outlined"
										onClick={async () => {
											await supabase.auth.signOut();
											navigate(`/auth/signin?invite_token=${token()}`);
										}}
									>
										Switch account
									</wa-button>
									<wa-button
										variant="brand"
										onClick={() => navigate("/workspace")}
									>
										Go to workspace
									</wa-button>
								</div>
							</div>
						}
					>
						<Show
							when={acceptStatus() === "ok"}
							fallback={
								<div
									style={{
										padding: "var(--wa-space-xl)",
										"text-align": "center",
									}}
								>
									<p style={{ margin: "0" }}>
										Accepting your invite to {invite()?.workspace_name}…
									</p>
								</div>
							}
						>
							<Navigate href="/workspace" />
						</Show>
					</Show>
				</Show>
				<Show when={!user()}>
					<div
						style={{
							padding: "var(--wa-space-xl)",
							"text-align": "center",
							"max-width": "520px",
							margin: "0 auto",
						}}
					>
						<h2
							style={{
								"font-size": "1.5rem",
								margin: "0 0 var(--wa-space-m) 0",
							}}
						>
							To access {invite()?.workspace_name} please sign up
						</h2>
						<p
							style={{
								margin: "0 0 var(--wa-space-l) 0",
								color: "var(--wa-color-text-quiet)",
							}}
						>
							You've been invited as {invite()?.email} ({invite()?.role}). Sign
							in if you already have an account, or create a new one to join the
							workspace.
						</p>
						<div
							style={{
								display: "flex",
								gap: "var(--wa-space-m)",
								"justify-content": "center",
							}}
						>
							<wa-button
								variant="brand"
								appearance="outlined"
								onClick={() => goAuth("signin")}
							>
								Sign in
							</wa-button>
							<wa-button variant="brand" onClick={() => goAuth("signup")}>
								Sign up
							</wa-button>
						</div>
						<p
							style={{
								"margin-top": "var(--wa-space-m)",
								"font-size": "0.875rem",
								color: "var(--wa-color-text-quiet)",
							}}
						>
							After signing in you'll be taken directly to the workspace.
						</p>
					</div>
				</Show>
			</Show>
		</Show>
	);
};

export default AcceptInvite;
