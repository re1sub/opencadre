import { style } from "@vanilla-extract/css";

export const page = style({
	maxWidth: "800px",
	margin: "0 auto",
	padding: "var(--wa-space-xl) var(--wa-space-m)",
});

export const title = style({
	fontSize: "2rem",
	fontWeight: 700,
	color: "var(--wa-color-text-normal)",
	margin: "0 0 var(--wa-space-s)",
});

export const lastUpdated = style({
	fontSize: "0.875rem",
	color: "var(--wa-color-text-quiet)",
	margin: "0 0 var(--wa-space-xl)",
});

export const section = style({
	marginBottom: "var(--wa-space-xl)",
});

export const sectionTitle = style({
	fontSize: "1.25rem",
	fontWeight: 600,
	color: "var(--wa-color-text-normal)",
	margin: "0 0 var(--wa-space-s)",
});

export const paragraph = style({
	fontSize: "0.95rem",
	lineHeight: "1.7",
	color: "var(--wa-color-text-normal)",
	margin: "0 0 var(--wa-space-m)",
});

export const list = style({
	fontSize: "0.95rem",
	lineHeight: "1.7",
	color: "var(--wa-color-text-normal)",
	margin: "0 0 var(--wa-space-m)",
	paddingLeft: "var(--wa-space-l)",
});

export const listItem = style({
	marginBottom: "var(--wa-space-xs)",
});

export const link = style({
	color: "var(--wa-color-text-link)",
	textDecoration: "underline",
});

export const consentCheckboxRow = style({
	gap: "var(--wa-space-s)",
	fontSize: "0.875rem",
	margin: "var(--wa-space-xs) 0",
});
