import { globalStyle, style } from "@vanilla-extract/css";

export const bubbleMenu = style({
	position: "fixed",
	zIndex: 1000,
	display: "flex",
	alignItems: "center",
	flexDirection: "row",
	flexWrap: "nowrap",
	gap: "var(--wa-space-2xs)",
	padding: "var(--wa-space-2xs)",
	borderRadius: "var(--wa-border-radius-m)",
	backgroundColor: "var(--wa-color-surface-raised)",
	border: "1px solid var(--wa-color-surface-border)",
	boxShadow: "var(--wa-shadow-m)",
	visibility: "hidden",
	scrollbarWidth: "none",
	selectors: {
		"&::-webkit-scrollbar": {
			display: "none",
		},
	},
	"@media": {
		"screen and (max-width: 768px)": {
			overflow: "auto",
			maxHeight: "40vh",
			flexDirection: "column",
		},
	},
});

export const buttonGroup = style({
	gap: "var(--wa-space-3xs)",
});

globalStyle("wa-button.bubble-menu-is-active::part(base)", {
	backgroundColor: "var(--wa-color-brand-fill-quiet)",
	color: "var(--wa-color-brand-on-quiet)",
});
