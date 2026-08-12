import { globalFontFace } from "@vanilla-extract/css";

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
