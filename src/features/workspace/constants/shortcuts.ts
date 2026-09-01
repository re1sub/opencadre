export const SHORTCUT_ACTIONS = [
	"new-page",
	"toggle-theme",
	"open-settings",
	"toggle-sidebar",
] as const;

export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number];

export interface ShortcutConfig {
	combo: string;
	enabled: boolean;
}

export type Shortcuts = Record<ShortcutAction, ShortcutConfig>;

export const SHORTCUT_META: Record<
	ShortcutAction,
	{ label: string; description: string }
> = {
	"new-page": {
		label: "New page",
		description: "Create a new page in the active workspace.",
	},
	"toggle-theme": {
		label: "Toggle theme",
		description: "Switch between light and dark theme.",
	},
	"open-settings": {
		label: "Open settings",
		description: "Open the settings dialog.",
	},
	"toggle-sidebar": {
		label: "Toggle sidebar",
		description: "Expand or collapse the sidebar.",
	},
};

export const DEFAULT_SHORTCUTS: Shortcuts = {
	"new-page": { combo: "mod+shift+n", enabled: true },
	"toggle-theme": { combo: "mod+l", enabled: true },
	"open-settings": { combo: "mod+,", enabled: true },
	"toggle-sidebar": { combo: "mod+b", enabled: true },
};
