import Papa from "papaparse";

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
