import Papa from "papaparse";

export const uid = () => crypto.randomUUID();

export const colorMix = (color: string, opacity: number = 30) =>
	`color-mix(in srgb, ${color} ${opacity}%, transparent)`;

export function getInitials(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) return "";

	const parts = trimmed.split(/\s+/);
	if (parts.length === 1) {
		return parts[0].slice(0, 2).toUpperCase();
	}

	const firstInitial = parts[0].charAt(0);
	const lastInitial = parts[parts.length - 1].charAt(0);
	return `${firstInitial}${lastInitial}`.toUpperCase();
}

export type CsvRow = Record<string, string>;

export const parseCsv = (text: string): CsvRow[] => {
	const result = Papa.parse(text, {
		header: true,
		skipEmptyLines: true,
		delimiter: ",",
		transformHeader: (h) => h.trim(),
	});
	return result.data as CsvRow[];
};

export function dropdownItemValue(e: Event) {
	const selectEvent = e as unknown as {
		detail: { item: { value?: string } | null };
	};
	return selectEvent.detail.item?.value;
}
