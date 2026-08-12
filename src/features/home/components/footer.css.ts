import { style } from "@vanilla-extract/css";

export const footer = style({
	background: "var(--wa-color-surface-default)",
	padding: "2rem",
});

export const body = style({
	maxWidth: "1380px",
	margin: "0 auto",
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	justifyContent: "space-around",
	gap: "2rem",
	paddingTop: "2rem",
	borderTop: "1px solid var(--wa-color-brand)",
	"@media": {
		"(max-width: 480px)": {
			flexDirection: "column",
		},
	},
});

export const logo = style({
	fontSize: "clamp(2rem, 5vw, 2.5rem)",
	fontWeight: 600,
	color: "var(--wa-color-brand)",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	gap: "0.5rem",
});

export const columnGroup = style({
	display: "flex",
	alignItems: "flex-start",
	gap: "5rem",
	"@media": {
		"(max-width: 480px)": {
			flexDirection: "column",
			gap: "2rem",
			textAlign: "center",
		},
	},
});

export const columnLinks = style({
	display: "flex",
	flexDirection: "column",
	gap: "0.5rem",
	marginTop: "0.5rem",
	"@media": {
		"(max-width: 480px)": {
			alignItems: "center",
		},
	},
});

export const link = style({
	fontWeight: 500,
	color: "var(--wa-color-text-link)",
	transition: "opacity 0.15s ease",
	":hover": {
		opacity: 0.7,
	},
});
