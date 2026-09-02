import { style } from "@vanilla-extract/css";

export const panel = style({
	width: "320px",
	maxWidth: "calc(100vw - 2rem)",
	padding: "var(--wa-space-xs)",
	border:
		"var(--wa-border-style) var(--wa-border-width-s) var(--wa-color-surface-border)",
	borderRadius: "var(--wa-border-radius-m)",
	backgroundColor: "var(--wa-color-surface-raised)",
	boxShadow: "var(--wa-shadow-l)",
});

export const field = style({
	width: "100%",
	minHeight: "4rem",
	resize: "vertical",
	fontFamily: "inherit",
	fontSize: "var(--wa-font-size-sm)",
	padding: "var(--wa-space-2xs)",
	border:
		"var(--wa-border-style) var(--wa-border-width-s) var(--wa-color-surface-border)",
	borderRadius: "var(--wa-border-radius-s)",
	backgroundColor: "var(--wa-color-surface-default)",
	color: "var(--wa-color-text-default)",
	outline: "none",
});

export const actions = style({
	display: "flex",
	gap: "var(--wa-space-2xs)",
	justifyContent: "flex-end",
	marginTop: "var(--wa-space-2xs)",
});

export const result = style({
	fontSize: "var(--wa-font-size-sm)",
	lineHeight: 1.5,
	maxHeight: "12rem",
	overflowY: "auto",
	padding: "var(--wa-space-2xs)",
	marginTop: "var(--wa-space-2xs)",
	border:
		"var(--wa-border-style) var(--wa-border-width-s) var(--wa-color-surface-border)",
	borderRadius: "var(--wa-border-radius-s)",
	backgroundColor: "var(--wa-color-surface-default)",
});
