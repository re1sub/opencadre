import { globalStyle } from "@vanilla-extract/css";

type ContentScale = "prose" | "compact";

const SCALE = {
	prose: {
		paragraphMargin: "0.75em 0",
		listPadding: "1.5em",
		headingMargin: "1.5em 0 0.5em",
		headingLineHeight: 1.2,
		headingSizes: {
			h1: "2rem",
			h2: "1.5rem",
			h3: "1.25rem",
			h4: "1.1rem",
		},
		blockquoteMargin: "0.75em 0",
		blockquotePadding: "1em",
		blockquoteFontSize: "1.1rem",
		codeFontSize: "0.9em",
		prePadding: "var(--wa-space-m)",
		preRadius: "var(--wa-border-radius-m)",
	},
	compact: {
		paragraphMargin: "0.5em 0",
		listPadding: "1.4em",
		headingMargin: "1em 0 0.4em",
		headingLineHeight: 1.25,
		headingSizes: {
			h1: "1.5rem",
			h2: "1.3rem",
			h3: "1.1rem",
			h4: null,
		},
		blockquoteMargin: "0.5em 0",
		blockquotePadding: "0.9em",
		blockquoteFontSize: null,
		codeFontSize: "0.85em",
		prePadding: "var(--wa-space-s)",
		preRadius: "var(--wa-border-radius-s)",
	},
} satisfies Record<
	ContentScale,
	{
		paragraphMargin: string;
		listPadding: string;
		headingMargin: string;
		headingLineHeight: number;
		headingSizes: { h1: string; h2: string; h3: string; h4: string | null };
		blockquoteMargin: string;
		blockquotePadding: string;
		blockquoteFontSize: string | null;
		codeFontSize: string;
		prePadding: string;
		preRadius: string;
	}
>;

export const applyMarkdownContentStyles = (
	root: string,
	scale: ContentScale,
) => {
	const s = SCALE[scale];
	const { headingSizes, ...rest } = s;

	globalStyle(`.${root} > *:first-child`, {
		marginTop: 0,
	});

	globalStyle(`.${root} > *:last-child`, {
		marginBottom: 0,
	});

	globalStyle(`.${root} p, .${root} ul, .${root} ol`, {
		margin: rest.paragraphMargin,
		lineHeight: 1.6,
	});

	globalStyle(`.${root} ul, .${root} ol`, {
		paddingLeft: rest.listPadding,
	});

	globalStyle(`.${root} h1, .${root} h2, .${root} h3`, {
		margin: rest.headingMargin,
		lineHeight: rest.headingLineHeight,
	});

	globalStyle(`.${root} h1`, {
		fontSize: headingSizes.h1,
	});

	globalStyle(`.${root} h2`, {
		fontSize: headingSizes.h2,
	});

	globalStyle(`.${root} h3`, {
		fontSize: headingSizes.h3,
	});

	if (headingSizes.h4) {
		globalStyle(`.${root} h4`, {
			fontSize: headingSizes.h4,
		});
	}

	globalStyle(`.${root} blockquote`, {
		margin: rest.blockquoteMargin,
		paddingLeft: rest.blockquotePadding,
		borderLeft: "3px solid var(--wa-color-surface-border)",
		color: "var(--wa-color-text-quiet)",
		fontFamily: "inherit",
		...(rest.blockquoteFontSize ? { fontSize: rest.blockquoteFontSize } : {}),
	});

	globalStyle(`.${root} code`, {
		padding: "0.15em 0.4em",
		borderRadius: "0.25em",
		backgroundColor: "var(--wa-color-surface-raised)",
		fontFamily: "monospace",
		fontSize: rest.codeFontSize,
	});

	globalStyle(`.${root} pre`, {
		padding: rest.prePadding,
		borderRadius: rest.preRadius,
		backgroundColor: "var(--wa-color-surface-raised)",
		overflowX: "auto",
	});

	globalStyle(`.${root} pre code`, {
		padding: 0,
		backgroundColor: "transparent",
	});

	globalStyle(`.${root} a`, {
		color: "var(--wa-color-text-link)",
		textDecoration: "underline",
	});

	globalStyle(`.${root}.ProseMirror:focus`, {
		outline: "none",
	});
};
