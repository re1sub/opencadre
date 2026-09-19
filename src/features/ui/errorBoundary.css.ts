import { style } from "@vanilla-extract/css";

export const errorBoundary = style({
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	gap: "var(--wa-space-m)",
	minHeight: "100vh",
	padding: "var(--wa-space-xl)",
	textAlign: "center",
	backgroundColor: "var(--wa-color-surface-default)",
	color: "var(--wa-color-text-normal)",
});

export const errorIcon = style({
	fontSize: "2rem",
	color: "var(--wa-color-brand)",
});

export const errorTitle = style({
	margin: 0,
	fontSize: "1.25rem",
	fontWeight: 600,
});

export const errorMessage = style({
	margin: 0,
	maxWidth: "32rem",
	color: "var(--wa-color-text-quiet)",
});

export const errorActions = style({
	display: "flex",
	gap: "var(--wa-space-s)",
	marginTop: "var(--wa-space-s)",
});
