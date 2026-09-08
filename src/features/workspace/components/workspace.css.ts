import { globalStyle, style } from "@vanilla-extract/css";

export const page = style({
	touchAction: "pan-y",
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
		"&::part(main-header)": {
			position: "sticky",
			top: 0,
			zIndex: 100,
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
	"@media": {
		"(max-width: 768px)": {
			display: "none",
		},
	},
});

globalStyle(`wa-page:has(.${sidebarResizer}:active)::part(body)`, {
	transition: "none",
});

export const mainHeader = style({
	padding: "0 var(--wa-space-s)",
	gap: 0,
	top: 0,
	width: "100%",
	zIndex: 100,
	borderBottom: "0.5px solid var(--wa-color-surface-border)",
	"@media": {
		"(max-width: 768px)": {
			padding: 0,
		},
	},
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
			minWidth: 0,
		},
		"&::part(label)": {
			whiteSpace: "pre",
			overflow: "hidden",
			textOverflow: "ellipsis",
			minWidth: 0,
			display: "block",
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
		marginBottom: "10px",
		border: "0",
	},
});

export const pageTitlePlaceholder = style({
	opacity: 0.55,
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
	gap: "var(--wa-space-s)",
	marginTop: "var(--wa-space-l)",
	minHeight: 0,
	flex: 1,
});

export const dialogActions = style({
	display: "flex",
	justifyContent: "flex-end",
	gap: "var(--wa-space-s)",
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
	borderRight: "1px solid var(--wa-color-surface-border)",
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
	transition: "transform 0.25s ease-in-out, opacity 0.2s ease-in-out",
	height: "60vh",
	overflow: "auto",
	padding: "var(--wa-space-2xs)",
	marginBottom: "var(--wa-space-xs)",

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
			height: "100%",
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
	padding: "var(--wa-space-s)",
});

export const settingsSectionTitle = style({
	margin: 0,
	fontSize: "1.1rem",
	fontWeight: 600,
	color: "var(--wa-color-text-normal)",
});

export const shortcutRow = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: "var(--wa-space-s)",
	padding: "var(--wa-space-xs) var(--wa-space-s)",
	marginTop: "var(--wa-space-xs)",
	borderRadius: "var(--wa-border-radius-s)",
	backgroundColor: "var(--wa-color-surface-default)",
	border: "1px solid var(--wa-color-surface-border)",
});

export const shortcutMeta = style({
	flexGrow: 1,
	minWidth: 0,
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-3xs)",
});

export const shortcutName = style({
	margin: 0,
	fontSize: "0.9rem",
	fontWeight: 600,
	color: "var(--wa-color-text-normal)",
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
});

export const shortcutDesc = style({
	margin: 0,
	fontSize: "0.75rem",
	color: "var(--wa-color-text-quiet)",
});

export const shortcutActions = style({
	display: "flex",
	alignItems: "center",
	gap: "var(--wa-space-2xs)",
});

export const shortcutKeys = style({
	display: "flex",
	gap: "var(--wa-space-3xs)",
	justifyContent: "flex-end",
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

// Members management
export const memberAddRow = style({
	display: "flex",
	alignItems: "flex-end",
	gap: "var(--wa-space-s)",
	flexWrap: "wrap",
});

export const memberAvatar = style({
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	width: "2rem",
	height: "2rem",
	borderRadius: "50%",
	fontSize: "0.7rem",
	fontWeight: 700,
	color: "#fff",
	flexShrink: 0,
	userSelect: "none",
});

export const memberMeta = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-3xs)",
	flexGrow: 1,
	minWidth: 0,
});

export const memberName = style({
	margin: 0,
	fontSize: "0.9rem",
	fontWeight: 600,
	color: "var(--wa-color-text-normal)",
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
});

export const memberEmail = style({
	color: "var(--wa-color-text-quiet)",
	fontSize: "0.75rem",
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
});

// Settings dialog container (user edit)
export const settingsDialogContainer = style({
	vars: {
		"--width": "auto",
	},

	selectors: {
		"&::part(body)": {
			padding: "0",
		},
		"&::part(dialog)": {
			marginLeft: "15%",
			marginRight: "15%",
		},
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
					marginLeft: "auto",
					marginRight: "auto",
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

export const dangerZone = style({
	border: "1px solid var(--wa-color-danger)",
	borderRadius: "var(--wa-border-radius-m)",
	padding: "var(--wa-space-s)",
});

export const workspaceDangerRow = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: "var(--wa-space-s)",
	padding: "var(--wa-space-xs) 0",
});
