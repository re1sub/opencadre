import { style } from "@vanilla-extract/css";

export const confirmMessage = style({
	margin: 0,
	fontSize: "0.9rem",
	color: "var(--wa-color-text-normal)",
	marginBottom: "var(--wa-space-s)",
});

export const confirmActions = style({
	display: "flex",
	justifyContent: "flex-end",
	gap: "var(--wa-space-s)",
	marginTop: "var(--wa-space-l)",
});
