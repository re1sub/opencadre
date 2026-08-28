import { style } from "@vanilla-extract/css";

export const page = style({
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	minHeight: "100vh",
});

export const card = style({
	padding: "1rem",
	display: "flex",
	flexDirection: "column",
	alignItems: "stretch",
	justifyContent: "center",
	textAlign: "center",
	gap: "1rem",
	backgroundColor: "var(--wa-color-surface-default)",
	border: "var(--wa-border-width-s) solid var(--wa-color-surface-border)",
	borderRadius: "var(--wa-border-radius-l)",
	width: "400px",
	"@media": {
		"(max-width: 600px)": {
			width: "85vw",
		},
	},
});

export const linkButton = style({
	color: "var(--wa-color-brand)",
	textDecoration: "underline",
	background: "none",
	border: "none",
	padding: 0,
	cursor: "pointer",
	fontSize: "inherit",
	fontFamily: "inherit",
});
