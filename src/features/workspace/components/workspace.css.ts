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

globalStyle(`.${workspaceName} .workspace-inline-rename`, {
	background: "transparent",
	border: "none",
	color: "inherit",
	font: "inherit",
	width: "100%",
	padding: 0,
});

export const workspaceItem = style({
	paddingInlineStart: "0.5rem",
	paddingRight: "0.2rem",
	selectors: {
		"&::part(checkmark)": {
			order: 2,
		},
	},
});

export const pageList = style({
	display: "flex",
	flexDirection: "column",
	gap: 0,
	listStyle: "none",
});

globalStyle(`${pageList} li`, {
	margin: 0,
});

export const pageRow = style({
	display: "flex",
	alignItems: "center",
	gap: "var(--wa-space-xs)",
	position: "relative",
});

export const pageMenuTrigger = style({
	position: "absolute",
	right: "0.5rem",
	top: "50%",
	transform: "translateY(-50%)",
	opacity: 0,
	transition: "opacity 0.15s ease",
	selectors: {
		[`${pageRow}:hover &`]: {
			opacity: 1,
		},
		[`${pageRow}:focus-within &`]: {
			opacity: 1,
		},
		"&::part(label)": {
			color: "var(--wa-color-text-normal, #ffffff)",
			fontSize: "1.1rem",
		},
	},
});

export const pageButton = style({
	flexGrow: 1,
	minWidth: 0,
	selectors: {
		"&::part(base)": {
			justifyContent: "flex-start",
		},
	},
});

export const addPageGroup = style({
	width: "100%",
	display: "flex",
	flexDirection: "row",
	gap: "var(--wa-space-xs)",
});

export const mainContent = style({
	padding: "var(--wa-space-xl)",
	position: "relative",
	minHeight: "100vh",
});

globalStyle("wa-page[view='mobile']", {
	vars: {
		"--menu-width": "auto !important",
	},
});

globalStyle(`wa-page[view='mobile'] .${sidebarResizer}`, {
	display: "none",
});

// Large Page Title style variant
export const pageTitleStyle = style({
	vars: {
		"--wa-form-control-value-font-size": "2rem",
		"--wa-form-control-value-font-weight": "700",
		"--wa-form-control-value-line-height": "1.2",
	},
});
