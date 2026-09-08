import type { JSX } from "solid-js";
import {
	createContext,
	createEffect,
	createSignal,
	useContext,
} from "solid-js";
import { useShortcuts } from "#/features/workspace/hooks/useShortcuts";
import { useEventListener } from "#/utils/useEventListener";
import { useHotkey } from "#/utils/useHotkey";
import { useLocalStorage } from "#/utils/useLocalStorage";

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

const parsePreference = (
	raw: string | null,
	fallback: ThemePreference,
): ThemePreference => {
	if (raw === "light" || raw === "dark" || raw === "system") {
		return raw;
	}
	return fallback;
};

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
	const [preference, setPreference] = useLocalStorage<ThemePreference>(
		STORAGE_KEY,
		"system",
		parsePreference,
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
	});

	useEventListener(
		() =>
			preference() === "system"
				? window.matchMedia("(prefers-color-scheme: dark)")
				: null,
		"change",
		() => setSystemTheme(getSystemTheme()),
	);

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
