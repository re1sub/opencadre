import { Show } from "solid-js";
import { useAuth } from "#/features/auth/AuthContext";
import { useTheme } from "#theme/ThemeProvider";
import { auth, drawerContent, logo, menuButton, navbar } from "./navbar.css";

const Navbar = () => {
	const { theme, toggleTheme } = useTheme();
	const { user, loading } = useAuth();

	return (
		<>
			<header class={navbar}>
				<a href="/" class={logo}>
					opencadre
				</a>

				<div class={auth}>
					<Show when={user()}>
						<wa-button href="/workspace" variant="brand">
							Go to app
						</wa-button>
					</Show>

					<Show when={!user() && !loading()}>
						<wa-button href="/auth" appearance="plain">
							Sign in
						</wa-button>

						<wa-button href="/auth?register" variant="brand">
							Get started
						</wa-button>
					</Show>

					<wa-button
						variant="neutral"
						appearance="plain"
						onClick={toggleTheme}
						aria-label="Toggle theme"
					>
						<wa-icon
							name={theme() === "dark" ? "sun" : "moon"}
							label="Toggle theme"
							style={{ "font-size": "1.5rem" }}
						></wa-icon>
					</wa-button>
				</div>

				<wa-button
					class={menuButton}
					appearance="plain"
					data-drawer="open navbar-drawer"
				>
					<wa-icon name="menu" label="Open navigation"></wa-icon>
				</wa-button>
			</header>

			<wa-drawer
				id="navbar-drawer"
				placement="end"
				light-dismiss
				label="Navigation"
				style={{ "--size": "85vw" }}
			>
				<div class={drawerContent}>
					<div>
						<Show when={user()}>
							<wa-button
								href="/workspace"
								variant="brand"
								style={{ width: "100%" }}
							>
								Go to app
							</wa-button>
						</Show>

						<Show when={!user() && !loading()}>
							<wa-button
								href="/auth?register"
								variant="brand"
								style={{ width: "100%", "margin-bottom": "0.5rem" }}
							>
								Get started
							</wa-button>
							<wa-button
								href="/auth"
								appearance="outlined"
								style={{ width: "100%" }}
							>
								Sign in
							</wa-button>
						</Show>
					</div>

					<wa-button
						variant="neutral"
						appearance="plain"
						onClick={toggleTheme}
						aria-label="Toggle theme"
						style={{ "font-size": "1.5rem", "margin-left": "auto" }}
					>
						<wa-icon
							name={theme() === "dark" ? "sun" : "moon"}
							label="Toggle theme"
						></wa-icon>
					</wa-button>
				</div>
			</wa-drawer>
		</>
	);
};

export default Navbar;
