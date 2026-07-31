import { style } from "@vanilla-extract/css";

export const mobileApp = style({
	background: "var(--wa-color-brand)",
	overflow: "hidden",
});

export const inner = style({
	display: "grid",
	gridTemplateColumns: "repeat(auto-fit, minmax(min(500px, 100%), 1fr))",
	alignItems: "center",
	justifyItems: "center",
	gap: "2rem",
	width: "100%",
	minHeight: "60vh",
});

export const titleColumn = style({
	display: "flex",
	flexDirection: "column",
	gap: "50px",
	maxWidth: "746px",
	padding: "2rem",
});

export const textBlock = style({
	display: "flex",
	flexDirection: "column",
	gap: "3rem",
	color: "var(--wa-color-neutral-95)",
});

export const title = style({
	fontWeight: 500,
});

export const description = style({
	fontSize: "clamp(1rem, 5vw, 2rem)",
	fontWeight: 200,
});

export const cta = style({
	display: "flex",
	flexDirection: "column",
	gap: "10px",
});

export const downloadButton = style({
	width: "fit-content",
	selectors: {
		"&::part(button)": {
			backgroundColor: "var(--wa-color-neutral-90)",
			color: "var(--wa-color-neutral-05)",
		},
	},
});

export const comingSoon = style({
	fontSize: "16px",
	fontWeight: 200,
	color: "#FAFBFC",
});

export const screenshotWrapper = style({
	backgroundColor: "#1E52C4",
	width: "100%",
	height: "100%",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
});
