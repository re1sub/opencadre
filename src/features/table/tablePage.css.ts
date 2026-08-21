import { globalStyle, style } from "@vanilla-extract/css";

export const tablePage = style({
	position: "relative",
	display: "flex",
	flexDirection: "column",
	gap: "8px",
	paddingLeft: "15px",
	"@media": {
		"(max-width: 768px)": {
			paddingLeft: "0",
		},
	},
});

export const tablePageHeader = style({
	display: "flex",
	gap: "8px",
});

export const editableHeaderWrapper = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	width: "100%",
});

export const headerSortFilterWrapper = style({
	position: "absolute",
	right: "0.5rem",
	top: "50%",
	transform: "translateY(-50%)",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	gap: "8px",
});

export const floatingAddRowBtn = style({
	position: "absolute",
	left: "-45px",
	top: "50%",
	transform: "translateY(-50%)",
	zIndex: 10,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	opacity: 0,
	transition: "opacity 0.15s ease-in-out, visibility 0.15s ease-in-out",
	"@media": {
		"(max-width: 768px)": {
			display: "none",
		},
	},
});

globalStyle(
	`.st-row:hover .${floatingAddRowBtn}, .st-row-hovered .${floatingAddRowBtn}, .${floatingAddRowBtn}:hover`,
	{
		opacity: 1,
	},
);

globalStyle(
	".st-row, .st-cell, .st-row-button-container, .st-content-wrapper, .st-content, .st-body-container, .st-body-pinned-left",
	{
		overflow: "visible !important",
	},
);

globalStyle(".st-content-wrapper, .st-content, .st-body-container", {
	height: "auto !important",
	maxHeight: "none !important",
});

globalStyle(".simple-table-root.st-external-scroll .st-header-container", {
	vars: {
		"--st-external-scroll-padding-top": "calc(-1 * var(--main-header-height))",
	},
});

globalStyle(".st-content", {
	vars: {
		"--st-odd-row-background-color": "transparent",
		"--st-even-row-background-color": "transparent",
	},
});

globalStyle(".st-cell", {
	borderColor: "var(--wa-color-neutral-border-quiet)",
	transform: "none !important",
});

globalStyle(".st-header-resize-handle", {
	height: "100%",
});

globalStyle(".st-header-resize-handle-container", {
	position: "absolute",
	top: "0",
	right: "-5px",
});

globalStyle(
	".st-header-resize-handle-container:hover .st-header-resize-handle",
	{
		backgroundColor: "var(--wa-color-brand)",
	},
);

globalStyle(".st-cell-editing > input.editable-cell-input", {
	color: "var(--wa-color-text-normal)",
});

// Table Header style variant
export const tableHeaderInputStyle = style({
	backgroundColor:
		"color-mix(in srgb, var(--st-header-background-color) 10%, black 10%)",
	borderRadius: "var(--wa-border-radius-l)",
	marginLeft: "0.2rem",
	padding: "0.2rem",
	border: "2px solid transparent",
	transition: "background-color 0.1s ease-in, border 0.2s ease-in",
	":hover": {
		border: "2px solid var(--wa-color-brand)",
	},
	":focus": {
		border: "2px solid var(--wa-color-brand)",
	},
	":active": {
		backgroundColor:
			"color-mix(in srgb, var(--st-header-background-color) 100%, black 15%)",
	},

	vars: {
		"--wa-form-control-value-font-size": "0.875rem",
		"--wa-form-control-value-font-weight": "600",
		"--wa-form-control-value-line-height": "1.2",
	},
});

globalStyle(`.st-dragging ${tableHeaderInputStyle}`, {
	backgroundColor: "transparent",
});
