import { style } from "@vanilla-extract/css";

export const gate = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	minHeight: "100vh",
	padding: "1rem",
});

export const card = style({
	display: "flex",
	flexDirection: "column",
	gap: "1rem",
	width: "100%",
	maxWidth: "32rem",
	boxSizing: "border-box",
	padding: "1rem",
	backgroundColor: "var(--wa-color-surface-default)",
	border: "var(--wa-border-width-s) solid var(--wa-color-surface-border)",
	borderRadius: "var(--wa-border-radius-l)",
});

export const title = style({
	margin: 0,
	fontSize: "1.5rem",
});

export const quietText = style({
	margin: 0,
	color: "var(--wa-color-text-quiet)",
});

export const errorText = style({
	margin: 0,
	color: "var(--wa-color-danger-text)",
	fontSize: "var(--wa-font-size-small)",
});

export const body = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-m)",
});

export const actions = style({
	display: "flex",
	gap: "var(--wa-space-s)",
	flexWrap: "wrap",
});

export const recoveryCode = style({
	display: "flex",
	alignItems: "center",
	gap: "var(--wa-space-s)",
});

export const waiting = style({
	display: "flex",
	alignItems: "center",
	gap: "var(--wa-space-s)",
});

export const deviceList = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-s)",
});

export const deviceRow = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: "var(--wa-space-m)",
	flexWrap: "wrap",
	padding: "var(--wa-space-s)",
	border: "var(--wa-border-width-s) solid var(--wa-color-neutral-border-quiet)",
	borderRadius: "var(--wa-border-radius-m)",
	transition: "background-color 0.2s ease-in-out",
});

export const deviceMeta = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-xs)",
});

export const deviceName = style({
	fontWeight: "var(--wa-font-weight-semibold)",
});

export const deviceHint = style({
	color: "var(--wa-color-text-quiet)",
	fontSize: "var(--wa-font-size-s)",
});

export const footer = style({
	display: "flex",
	justifyContent: "end",
});
