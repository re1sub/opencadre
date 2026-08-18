import { globalStyle, style } from "@vanilla-extract/css";

export const bubbleMenu = style({
	position: "fixed",
	zIndex: 1000,
	maxWidth: "max-content",
	opacity: "0.95 !important",
	visibility: "hidden",
});

export const bubbleMenuContent = style({
	display: "grid",
	gridTemplateColumns: "repeat(3, auto)",
	gap: "var(--wa-space-3xs)",
	padding: "var(--wa-space-xs)",
	borderRadius: "var(--wa-border-radius-m)",
	backgroundColor: "var(--wa-color-surface-raised)",
	border: "1px solid var(--wa-color-surface-border)",
	boxShadow: "var(--wa-shadow-m)",
	justifyItems: "center",
	alignItems: "center",
	width: "130%",
});

export const buttonGroup = style({
	gap: "var(--wa-space-3xs)",
	opacity: 0.5,
});

globalStyle("wa-button.bubble-menu-is-active::part(base)", {
	backgroundColor: "var(--wa-color-brand-fill-quiet)",
	color: "var(--wa-color-brand-on-quiet)",
});

globalStyle(`${bubbleMenu} wa-divider`, {
	gridColumn: "1 / -1",
	width: "100%",
	margin: "var(--wa-space-3xs) 0",
});

export const bubbleMenuButton = style({
	width: "100%",
	selectors: {
		"&::part(base)": {
			justifyContent: "flex-start",
		},
	},
});
