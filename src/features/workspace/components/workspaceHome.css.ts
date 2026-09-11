import { style } from "@vanilla-extract/css";

export const wrapper = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-l)",
	maxWidth: "56rem",
	margin: "0 auto",
});

export const heading = style({
	margin: 0,
	fontSize: "1.75rem",
	fontWeight: 700,
	color: "var(--wa-color-text-normal)",
});

export const stats = style({
	margin: 0,
	fontSize: "0.875rem",
	color: "var(--wa-color-text-quiet)",
});

export const actionGrid = style({
	display: "flex",
	gap: "var(--wa-space-s)",
	width: "min(100%, 600px)",
	overflowX: "auto",
	overflowY: "hidden",
	paddingBottom: "var(--wa-space-s)",
	scrollSnapType: "x mandatory",
});

export const actionCard = style({
	scrollSnapAlign: "start",
	flex: "0 0 12rem",
	height: "100%",
	borderRadius: "var(--wa-border-radius-m)",
	border: "var(--wa-border-width-s) solid var(--wa-color-surface-border)",

	":hover": {
		backgroundColor: "var(--wa-color-surface-default)",
	},

	selectors: {
		"&::part(button)": {
			padding: "var(--wa-space-s)",
			height: "100%",
			flexDirection: "column",
			justifyContent: "center",
			alignItems: "center",
			gap: "var(--wa-space-xs)",
		},
	},
});

export const actionIcon = style({
	fontSize: "1.5rem",
	margin: 0,
});

export const actionLabel = style({
	fontSize: "0.9rem",
	fontWeight: 600,
	color: "var(--wa-color-text-normal)",
});

export const actionHint = style({
	fontSize: "0.75rem",
	color: "var(--wa-color-text-quiet)",
	margin: 0,
});

export const emptyHint = style({
	margin: 0,
	fontSize: "0.875rem",
	color: "var(--wa-color-text-quiet)",
});
