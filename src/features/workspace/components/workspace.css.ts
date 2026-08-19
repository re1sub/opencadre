import { globalStyle, style } from "@vanilla-extract/css";

// workspace.css.ts
export const page = style({
	touchAction: "pan-y", // <-- Allows vertical scrolling while enabling JS horizontal drag capture
	selectors: {
		"&::part(body)": {
			transition: "grid-template-columns 0.2s ease-in-out",
		},
		"&::part(drawer)": {
			vars: {
				"--spacing": "0",
				"--size": "20rem",
			},
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

export const pageTitleStyle = style({
	vars: {
		"--page-title-font-size": "2rem",
		"--page-title-font-weight": "700",
		"--page-title-line-height": "1.2",
		"--wa-form-control-value-font-size": "var(--page-title-font-size)",
		"--wa-form-control-value-font-weight": "var(--page-title-font-weight)",
		"--wa-form-control-value-line-height": "var(--page-title-line-height)",
		fontSize: "var(--page-title-font-size)",
		fontWeight: "var(--page-title-font-weight)",
		lineHeight: "var(--page-title-line-height)",
		paddingBottom: "0",
		marginBottom: "0",
		border: "0",
	},
});

// Sidebar footer user menu
export const userMenuTrigger = style({
	width: "100%",
	minWidth: 0,
	selectors: {
		"&::part(base)": {
			justifyContent: "flex-start",
		},
		"&::part(button)": {
			padding: "var(--wa-space-s) var(--wa-space-xs)",
			width: "100%",
		},
	},
});

export const userMenuName = style({
	flexGrow: 1,
	minWidth: 0,
	textAlign: "left",
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
});

// Shared dialog layout
export const dialogBody = style({
	display: "flex",
	flexDirection: "column",
});

export const dialogActions = style({
	display: "flex",
	justifyContent: "flex-end",
	gap: "var(--wa-space-s)",
	marginTop: "var(--wa-space-l)",
});

export const dialogLabel = style({
	fontSize: "0.875rem",
	color: "var(--wa-color-text-quiet)",
	margin: 0,
});

// Settings dialog
export const settingsLayout = style({
	position: "relative",
	display: "flex",
	flexDirection: "row",
	gap: "var(--wa-space-l)",
	minHeight: "16rem",
	overflow: "hidden",
	"@media": {
		"(max-width: 767px)": {
			minHeight: "14rem",
			height: "100%",
		},
	},
});

export const settingsNav = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-2xs)",
	flexShrink: 0,
	width: "10rem",
	"@media": {
		"(max-width: 767px)": {
			width: "100%",
		},
	},
});

export const settingsNavButton = style({
	justifyContent: "flex-start",
	selectors: {
		"&::part(base)": {
			justifyContent: "flex-start",
			width: "100%",
		},
		"&::part(caret)": {
			display: "none",
			marginLeft: "auto",
			vars: {
				"--rotate-angle": "-90deg",
			},
		},
	},
	"@media": {
		"(max-width: 767px)": {
			fontSize: "1.1rem",
			selectors: {
				"&::part(caret)": {
					display: "inline-flex",
				},
			},
		},
	},
});

globalStyle(`${settingsNav} wa-button:not(:last-child)::part(base)`, {
	borderBottom: "1px solid var(--wa-color-surface-border)",
	borderRadius: "0",
});

export const settingsPanel = style({
	flex: 1,
	minWidth: 0,
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-s)",
	transition: "transform 0.25s ease-in-out, opacity 0.2s ease-in-out",
	"@media": {
		"(max-width: 767px)": {
			position: "absolute",
			inset: 0,
			zIndex: 1,
			transform: "translateX(100%)",
			opacity: 0,
			backgroundColor: "var(--wa-color-surface-raised)",
			padding: "var(--wa-space-m)",
			boxShadow: "var(--wa-shadow-l)",
			overflowY: "auto",
		},
	},
});

export const settingsPanelOpen = style({
	"@media": {
		"(max-width: 767px)": {
			transform: "translateX(0)",
			opacity: 1,
		},
	},
});

export const settingsBack = style({
	display: "none",
	alignSelf: "flex-start",
	paddingBottom: "var(--wa-space-s)",
	borderBottom: "1px solid var(--wa-color-surface-border)",
	borderRadius: 0,
	width: "100%",
	selectors: {
		"&::part(button)": {
			padding: 0,
		},
		"&::part(label)": {
			marginRight: "auto",
		},
	},
	"@media": {
		"(max-width: 767px)": {
			display: "inline-flex",
		},
	},
});

export const settingsSection = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-s)",
});

export const settingsSectionTitle = style({
	margin: 0,
	fontSize: "0.875rem",
	fontWeight: 600,
	color: "var(--wa-color-text-normal)",
});

export const shortcutRow = style({
	display: "grid",
	gridTemplateColumns: "1fr auto 1fr",
	alignItems: "center",
	gap: "var(--wa-space-s)",
	padding: "var(--wa-space-xs) var(--wa-space-s)",
	marginTop: "var(--wa-space-xs)",
	borderRadius: "var(--wa-border-radius-s)",
	backgroundColor: "var(--wa-color-surface-default)",
	border: "1px solid var(--wa-color-surface-border)",
	fontSize: "0.7rem",
});

export const shortcutKeys = style({
	display: "flex",
	gap: "var(--wa-space-3xs)",
	justifyContent: "flex-end",
});

export const kbd = style({
	fontFamily: "var(--wa-font-family-code)",
	fontSize: "0.5rem",
	padding: "0.125rem 0.375rem",
	borderRadius: "var(--wa-border-radius-s)",
	border:
		"var(--wa-border-width-s) var(--wa-border-style) var(--wa-color-surface-border)",
	backgroundColor: "var(--wa-color-surface-raised)",
	color: "var(--wa-color-text-quiet)",
});

// Trash dialog
export const trashRow = style({
	display: "flex",
	alignItems: "center",
	gap: "var(--wa-space-s)",
	padding: "var(--wa-space-xs) 0",
});

export const trashRowMeta = style({
	flexGrow: 1,
	minWidth: 0,
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-3xs)",
});

export const trashRowTitle = style({
	margin: 0,
	fontSize: "0.9rem",
	fontWeight: 600,
	color: "var(--wa-color-text-normal)",
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
});

export const trashRowSub = style({
	margin: 0,
	fontSize: "0.75rem",
	color: "var(--wa-color-text-quiet)",
});

export const trashEmpty = style({
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	gap: "var(--wa-space-s)",
	padding: "var(--wa-space-xl) var(--wa-space-m)",
	color: "var(--wa-color-text-quiet)",
	textAlign: "center",
});

// Members dialog
export const memberRow = style({
	display: "flex",
	alignItems: "center",
	gap: "var(--wa-space-s)",
	padding: "var(--wa-space-xs) 0",
});

// Settings dialog container (user edit)
export const settingsDialogContainer = style({
	vars: {
		"--width": "min(72vh, 48rem)",
	},
	"@media": {
		"(max-width: 767px)": {
			selectors: {
				"&::part(dialog)": {
					width: "100%",
					maxWidth: "100%",
					height: "100%",
					maxHeight: "100%",
					borderRadius: "0",
				},
			},
			vars: {
				"--spacing": "var(--wa-space-2xs)",
			},
		},
	},
});

export const settingsFooter = style({
	display: "flex",
	alignItems: "center",
	gap: "var(--wa-space-s)",
	width: "100%",
});

export const settingsFooterSpacer = style({
	flex: 1,
});
