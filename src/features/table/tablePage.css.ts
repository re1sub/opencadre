import { globalStyle, style } from "@vanilla-extract/css";

export const tablePage = style({
	display: "flex",
	flexDirection: "column",
	gap: "8px",
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

globalStyle(".st-content-wrapper, .st-content, .st-body-container", {
	overflow: "visible !important",
	height: "auto !important",
	maxHeight: "none !important",
});

globalStyle(".st-content", {
	vars: {
		"--st-odd-row-background-color": "transparent",
		"--st-even-row-background-color": "transparent",
	},
});

globalStyle(".st-cell", {
	borderColor: "var(--wa-color-neutral-border-quiet)",
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

globalStyle(".st-cell", {
	transform: "none !important",
});

globalStyle(".st-cell-editing > input.editable-cell-input", {
	color: "var(--wa-color-text-normal)",
});

globalStyle('[data-row-id*="__add_row__"]', {
	pointerEvents: "none",
	backgroundColor: "transparent !important",
	vars: {
		"--st-cell-padding": "0",
	},
});

globalStyle('[data-row-id*="__add_row__"] div', {
	width: "100%",
});

globalStyle("#__add_row__-col_1", {
	width: "100% !important",
});

globalStyle("#__add_row__-col_1", {
	// @ts-expect-error: The !important rule does work
	position: "sticky !important",
	top: "0",
	zIndex: "100",
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
