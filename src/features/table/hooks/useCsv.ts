import type { CellValue } from "@simple-table/solid";
import Papa from "papaparse";
import * as Y from "yjs";
import { mutateTableDoc } from "./tableYjs";

export const useCsv = (ydoc: () => Y.Doc | null | undefined) => {
	const importCsv = (csvText: string) => {
		const parsed = Papa.parse<Record<string, string>>(csvText, {
			header: true,
			skipEmptyLines: true,
		});

		if (parsed.errors.length > 0) {
			console.error("CSV Parse errors:", parsed.errors);
			return;
		}
		if (parsed.data.length === 0) {
			console.error("CSV contains no data");
			return;
		}

		const headers = parsed.meta.fields || [];
		if (headers.length === 0) return;

		const doc = ydoc();
		if (!doc) return;

		mutateTableDoc(doc, ({ colOrder, colsMap, rowOrder, rowsMap }) => {
			colOrder.delete(0, colOrder.length);
			colsMap.clear();
			rowOrder.delete(0, rowOrder.length);
			rowsMap.clear();

			const cOrder: string[] = [];
			headers.forEach((header, i) => {
				const accessor = `col_${i + 1}`;
				cOrder.push(accessor);
				const cMap = new Y.Map<string | number>();
				cMap.set("accessor", accessor);
				cMap.set("label", header);
				cMap.set("width", 200);
				colsMap.set(accessor, cMap);
			});
			colOrder.insert(0, cOrder);

			const rOrder: string[] = [];
			parsed.data.forEach((row, i) => {
				const newRowId = `row_${Date.now()}_${i}`;
				rOrder.push(newRowId);
				const rMap = new Y.Map<CellValue>();
				headers.forEach((header, j) => {
					rMap.set(`col_${j + 1}`, row[header] || "");
				});
				rowsMap.set(newRowId, rMap);
			});
			rowOrder.insert(0, rOrder);
		});
	};

	return {
		importCsv,
	};
};
