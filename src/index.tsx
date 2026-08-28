/* @refresh reload */

import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import "solid-devtools";
import "#/webawesome.imports";
import WaPage from "@awesome.me/webawesome/dist/components/page/page.js";
import "#styles/webawesome.css";
import "#styles/global.css";

import { AuthProvider } from "#/features/auth/AuthContext";
import ThemeProvider from "#/theme/ThemeProvider";
import App from "./App";

const root = document.getElementById("root");

// Web Awesome's WaPage sets its `disable-navigation-toggle` reactive property
// from inside firstUpdated(), which lit's dev build flags as a
// "change-in-update" warning on every mount. It's harmless; silence it for
// this one class.
(WaPage as unknown as { disableWarning(warning: string): void }).disableWarning(
	"change-in-update",
);

const queryClient = new QueryClient();

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
	);
} else if (import.meta.env.DEV) {
	document.title += " - local";
}

render(
	() => (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<ThemeProvider>
					<App />
				</ThemeProvider>
			</AuthProvider>
		</QueryClientProvider>
	),
	root!,
);
