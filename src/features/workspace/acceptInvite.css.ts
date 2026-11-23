import { style } from "@vanilla-extract/css";

export const errorActions = style({
	display: "flex",
	gap: "var(--wa-space-m)",
	justifyContent: "center",
	marginTop: "var(--wa-space-m)",
});

export const centeredPanel = style({
	padding: "var(--wa-space-xl)",
	textAlign: "center",
	maxWidth: "520px",
	margin: "0 auto",
});

export const centeredActions = style({
	display: "flex",
	gap: "var(--wa-space-m)",
	justifyContent: "center",
});

export const helpText = style({
	marginTop: "var(--wa-space-m)",
	fontSize: "0.875rem",
	color: "var(--wa-color-text-quiet)",
});
