/* @refresh reload */
import { render } from "solid-js/web";
import "solid-devtools";
import "./webawesome.imports";
import "./styles/webawesome.css";
import "./styles/global.css";

import App from "./App";
import { ThemeProvider } from "./theme/ThemeProvider";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
	);
}

render(
	() => (
		<ThemeProvider>
			<App />
		</ThemeProvider>
	),
	root!,
);
