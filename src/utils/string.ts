export const toSlug = (text: string) =>
	text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

export const emailPrefix = (email: string) => email.split("@")[0];

export const isEmail = (value: string) => value.includes("@");
