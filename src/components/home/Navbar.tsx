import { auth, drawerContent, logo, menuButton, navbar } from "./navbar.css";
import { useTheme } from "../../theme/ThemeProvider";

export function Navbar() {
	const { theme, toggleTheme } = useTheme();

	return (
		<>
			<header class={navbar}>
				<a href="/" class={logo}>
					opencadre
				</a>

				<div class={auth}>
					<wa-button href="/auth" appearance="plain">
						Sign in
					</wa-button>

					<wa-button href="/auth?register" variant="brand">
						Get started
					</wa-button>

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
						/>
					</wa-button>
				</div>

				<wa-button
					class={menuButton}
					appearance="plain"
					data-drawer="open navbar-drawer"
					aria-label="Open navigation"
				>
					<wa-icon name="menu" />
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
						/>
					</wa-button>
				</div>
			</wa-drawer>
		</>
	);
}
