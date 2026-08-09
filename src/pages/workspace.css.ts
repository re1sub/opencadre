import { globalStyle, style } from "@vanilla-extract/css";

export const page = style({
	selectors: {
		"&::part(body)": {
			transition: "grid-template-columns 0.2s ease-in-out",
		},
	},
});

export const sidebar = style({
	display: "flex",
	flexDirection: "column",
	gap: "0",
	height: "100%",
	position: "relative",
	overflowX: "hidden",
});

export const sidebarResizer = style({
	position: "absolute",
	top: 0,
	bottom: 0,
	left: 0,
	touchAction: "none",
	transition: "background-color 0.2s",
	":hover": {
		backgroundColor: "var(--wa-color-brand)",
	},
	":active": {
		backgroundColor: "var(--wa-color-brand)",
	},
});

globalStyle(`wa-page:has(.${sidebarResizer}:active)::part(body)`, {
	transition: "none",
});

export const navHeader = style({
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	flexDirection: "row",
	gap: 0,
	overflowX: "hidden",
});

export const navFooter = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-xs)",
	width: "100%",
	overflowX: "hidden",
});

export const workspaceTrigger = style({
	selectors: {
		"&::part(button)": {
			padding: "var(--wa-space-l) var(--wa-space-xs)",
		},
		"&::part(caret)": {
			visibility: "hidden",
		},
		"&:hover::part(caret)": {
			visibility: "visible",
		},
	},
});

export const closeSidebarButton = style({
	"@media": {
		"(max-width: 768px)": {
			display: "none",
		},
	},
});

export const workspaceName = style({
	flexGrow: 1,
	textAlign: "left",
});

export const pageList = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-xs)",
	listStyle: "none",
});

export const pageButton = style({
	width: "100%",
});

export const addPage = style({
	width: "100%",
});

export const mainContent = style({
	padding: "var(--wa-space-xl)",
	position: "relative",
});

globalStyle("wa-page[view='mobile']", {
	vars: {
		"--menu-width": "auto !important",
	},
});

globalStyle(`wa-page[view='mobile'] .${sidebarResizer}`, {
	display: "none",
});
