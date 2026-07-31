import type { JSX } from "solid-js";
import {
	createContext,
	createEffect,
	createSignal,
	useContext,
} from "solid-js";

export type Theme = "light" | "dark";

interface ThemeContextValue {
	theme: () => Theme;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>();

function getInitialTheme(): Theme {
	if (typeof window === "undefined") return "light";
	const stored = window.localStorage.getItem("theme");
	if (stored === "light" || stored === "dark") return stored;
	return window.matchMedia?.("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function applyThemeClass(theme: Theme) {
	const el = document.documentElement;
	el.classList.toggle("wa-dark", theme === "dark");
	el.classList.toggle("wa-light", theme === "light");
	el.dataset.theme = theme;
}

export function ThemeProvider(props: { children: JSX.Element }) {
	const [theme, setTheme] = createSignal<Theme>(getInitialTheme());

	applyThemeClass(theme());

	createEffect(() => {
		applyThemeClass(theme());
		window.localStorage.setItem("theme", theme());
	});

	const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

	return (
		<ThemeContext.Provider value={{ theme, toggleTheme }}>
			{props.children}
		</ThemeContext.Provider>
	);
}

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
	return ctx;
}
