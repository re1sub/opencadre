/* @refresh reload */

import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import "solid-devtools";
import "#/webawesome.imports";
import "#styles/webawesome.css";
import "#styles/global.css";

import { AuthProvider } from "#/features/auth/AuthContext";
import ThemeProvider from "#/theme/ThemeProvider";
import App from "./App";

const root = document.getElementById("root");

const queryClient = new QueryClient();

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
	);
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
