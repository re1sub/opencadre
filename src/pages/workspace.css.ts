import { globalStyle, style } from "@vanilla-extract/css";

export const page = style({
	vars: {
		"--menu-width": "260px",
	},
});

export const sidebar = style({
	display: "flex",
	flexDirection: "column",
	height: "100%",
	position: "relative",
});

export const sidebarResizer = style({
	position: "absolute",
	top: 0,
	bottom: 0,
	left: 0,
	width: "3px",
	cursor: "col-resize",
	touchAction: "none",
	transition: "background-color 0.2s",
	":hover": {
		backgroundColor: "var(--wa-color-brand)",
	},
	":active": {
		backgroundColor: "var(--wa-color-brand)",
	},
});

export const navFooter = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-xs)",
});

export const workspaceTrigger = style({
	display: "flex",
	alignItems: "center",
	gap: "var(--wa-space-xs)",
	width: "100%",
	borderRadius: "var(--wa-border-radius-m)",
	padding: "var(--wa-space-xs)",
	transition: "background-color 0.2s",

	":hover": {
		backgroundColor: "var(--wa-color-surface-raised)",
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
