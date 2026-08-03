import { style } from "@vanilla-extract/css";

export const navbar = style({
	position: "sticky",
	top: 0,
	zIndex: 10,
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	height: "77px",
	width: "100%",
	padding: "0 2vw",
	background: "var(--wa-color-surface-default)",
	borderBottom: "1px solid var(--wa-color-surface-border)",
});

export const logo = style({
	fontSize: "clamp(1rem, 5vw, 2rem)",
	fontWeight: 600,
});

export const auth = style({
	display: "flex",
	alignItems: "center",
	gap: "10px",

	"@media": {
		"screen and (max-width: 768px)": {
			display: "none",
		},
	},
});

export const menuButton = style({
	display: "none",

	"@media": {
		"screen and (max-width: 768px)": {
			display: "inline-flex",
		},
	},
});

export const drawerContent = style({
	display: "flex",
	flexDirection: "column",
	justifyContent: "space-between",
	height: "100%",
	gap: "1rem",
});

export const drawerButton = style({
	width: "100%",
});
