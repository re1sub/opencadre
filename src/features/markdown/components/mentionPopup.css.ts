import { style } from "@vanilla-extract/css";

export const popupPanel = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-3xs)",
	padding: "var(--wa-space-3xs)",
	border:
		"var(--wa-border-style) var(--wa-border-width-s) var(--wa-color-surface-border)",
	borderRadius: "var(--wa-border-radius-m)",
	backgroundColor: "var(--wa-color-surface-raised)",
	boxShadow: "var(--wa-shadow-m)",
	minWidth: "11rem",
	maxWidth: "var(--auto-size-available-width)",
	maxHeight: "var(--auto-size-available-height)",
	overflow: "auto",
});

export const memberRow = style({
	display: "flex",
	alignItems: "center",
	gap: "var(--wa-space-xs)",
	width: "100%",
	background: "transparent",
	border: "none",
	padding: "var(--wa-space-3xs) var(--wa-space-xs)",
	borderRadius: "var(--wa-border-radius-s)",
	cursor: "pointer",
	color: "var(--wa-color-text-normal)",
	font: "inherit",
	textAlign: "left",
	selectors: {
		"&:hover": {
			backgroundColor: "var(--wa-color-surface-border)",
		},
	},
});

export const memberRowSelected = style({
	backgroundColor: "var(--wa-color-surface-border)",
});

export const memberLabel = style({
	flexGrow: "1",
	minWidth: "0",
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
});
