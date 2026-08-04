import { globalFontFace } from "@vanilla-extract/css";

// import geistRegular from "#assets/fonts/Geist/Geist-Italic-VariableFont_wght.ttf";
// import geistItalic from "#assets/fonts/Geist/Geist-VariableFont_wght.ttf";
// import vercettiWoff from "#assets/fonts/Vercetti/Vercetti-Regular.woff";
// import vercettiWoff2 from "#assets/fonts/Vercetti/Vercetti-Regular.woff2";

export const geistFont = globalFontFace("Geist", [
	{
		src: `url("../assets/fonts/Geist/Geist-VariableFont_wght.ttf") format("truetype")`,
		fontWeight: "100 900",
		fontStyle: "normal",
	},
	{
		src: `url("../assets/fonts/Geist/Geist-Italic-VariableFont_wght.ttf") format("truetype")`,
		fontWeight: "100 900",
		fontStyle: "italic",
	},
]);

export const vercettiFont = globalFontFace("Vercetti", {
	src: `
    url("../assets/fonts/Vercetti/Vercetti-Regular.woff2") format("woff2"),
    url("../assets/fonts/Vercetti/Vercetti-Regular.woff") format("woff")
  `,
	fontWeight: "400",
	fontStyle: "normal",
	fontDisplay: "swap",
});
