export type YjsUpdateOrigin = string | null | undefined;

type CellInput = string | number | string[] | boolean | null | undefined;

export const asString = (v: CellInput): string =>
	typeof v === "string" ? v : "";

export const asNullableString = (v: CellInput): string | null =>
	typeof v === "string" ? v : null;

export const asStringArray = (v: CellInput): string[] =>
	Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

export const asNumber = (v: CellInput): number =>
	typeof v === "number" ? v : 200;
