import { globalStyle, style } from "@vanilla-extract/css";

globalStyle("wa-page::part(aside)", {
	overflow: "hidden",
});

export const panel = style({
	display: "flex",
	flexDirection: "column",
	width: "100%",
	height: "100%",
	minWidth: 0,
	overflow: "hidden",
	borderLeft:
		"var(--wa-border-width-s) var(--wa-border-style) var(--wa-color-surface-border)",
	backgroundColor: "var(--wa-color-surface-default)",
	opacity: 1,
	transition: "opacity 160ms ease",
});

export const panelClosed = style({
	opacity: 0,
	pointerEvents: "none",
});

export const header = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: "var(--wa-space-s)",
	padding: "var(--wa-space-s)",
	minWidth: 0,
});

export const closeButton = style({
	position: "absolute",
	top: "var(--wa-space-s)",
	right: "var(--wa-space-s)",
});

export const body = style({
	flex: 1,
	minHeight: 0,
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	gap: "var(--wa-space-2xs)",
	padding: "var(--wa-space-l)",
	textAlign: "center",
});

export const bodyTitle = style({
	margin: 0,
	fontSize: "var(--wa-font-size-l)",
	fontWeight: 600,
	letterSpacing: "-0.02em",
});

export const bodyText = style({
	margin: 0,
	maxWidth: "15rem",
	color: "var(--wa-color-text-quiet)",
	fontSize: "var(--wa-font-size-xs)",
	lineHeight: 1.6,
});

export const composerBox = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-2xs)",
	backgroundColor: "var(--wa-color-surface-raised)",
	position: "relative",
});

export const composerActions = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: "var(--wa-space-2xs)",
	padding: "var(--wa-space-xs)",
	position: "absolute",
	bottom: 0,
	width: "100%",
});

export const disclaimer = style({
	marginTop: "var(--wa-space-2xs)",
	color: "var(--wa-color-text-quiet)",
	fontSize: "var(--wa-font-size-2xs)",
	textAlign: "center",
});
