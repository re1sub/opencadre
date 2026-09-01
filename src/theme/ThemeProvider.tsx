import type { JSX } from "solid-js";
import {
	createContext,
	createEffect,
	createSignal,
	onCleanup,
	useContext,
} from "solid-js";
import { useShortcuts } from "#/features/workspace/hooks/useShortcuts";
import { useHotkey } from "#/utils/useHotkey";

export type Theme = "light" | "dark";
export type ThemePreference = "system" | "light" | "dark";

interface ThemeContextValue {
	theme: () => Theme;
	themePreference: () => ThemePreference;
	setThemePreference: (preference: ThemePreference) => void;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>();

const STORAGE_KEY = "theme";

function getInitialPreference(): ThemePreference {
	if (typeof window === "undefined") return "system";
	const stored = window.localStorage.getItem(STORAGE_KEY);
	if (stored === "light" || stored === "dark" || stored === "system") {
		return stored;
	}
	return "system";
}

function getSystemTheme(): Theme {
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

const ThemeProvider = (props: { children: JSX.Element }) => {
	const [preference, setPreference] = createSignal<ThemePreference>(
		getInitialPreference(),
	);
	const [systemTheme, setSystemTheme] = createSignal<Theme>(
		typeof window === "undefined" ? "light" : getSystemTheme(),
	);

	const theme = (): Theme => {
		const currentPref = preference();
		return currentPref === "system" ? systemTheme() : currentPref;
	};

	createEffect(() => {
		applyThemeClass(theme());
		window.localStorage.setItem(STORAGE_KEY, preference());
	});

	createEffect(() => {
		if (preference() !== "system") return;
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => setSystemTheme(getSystemTheme());
		mediaQuery.addEventListener("change", onChange);
		onCleanup(() => mediaQuery.removeEventListener("change", onChange));
	});

	const toggleTheme = () =>
		setPreference(theme() === "light" ? "dark" : "light");

	const { shortcuts } = useShortcuts();
	useHotkey(() => {
		const config = shortcuts()["toggle-theme"];
		return config.enabled ? config.combo : null;
	}, toggleTheme);

	return (
		<ThemeContext.Provider
			value={{
				theme,
				themePreference: preference,
				setThemePreference: setPreference,
				toggleTheme,
			}}
		>
			{props.children}
		</ThemeContext.Provider>
	);
};

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
	return ctx;
}

export default ThemeProvider;
