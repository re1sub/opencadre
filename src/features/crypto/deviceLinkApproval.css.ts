import { style } from "@vanilla-extract/css";

export const row = style({
	display: "flex",
	alignItems: "center",
	gap: "var(--wa-space-m)",
	flexWrap: "wrap",
});

export const meta = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-xs)",
	flex: "1 1 16rem",
});

export const heading = style({
	margin: 0,
	fontSize: "var(--wa-font-size-l)",
});

export const detail = style({
	margin: 0,
	color: "var(--wa-color-text-quiet)",
});

export const actions = style({
	display: "flex",
	gap: "var(--wa-space-s)",
	flexWrap: "wrap",
});

export const errorText = style({
	margin: 0,
	color: "var(--wa-color-danger-text)",
	fontSize: "var(--wa-font-size-s)",
});
