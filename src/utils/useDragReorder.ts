import { move } from "@dnd-kit/helpers";
import type { DragDropProviderProps } from "@dnd-kit/solid";

export function useDragReorder<T extends { id: string }>(
	getItems: () => T[],
	onChange: (next: T[], movedId: string) => void,
): NonNullable<DragDropProviderProps["onDragEnd"]> {
	return (e) => {
		const { source, canceled } = e.operation;
		if (!source || canceled) return;

		const next = move(getItems(), e);
		if (next === getItems()) return;

		onChange(next, String(source.id));
	};
}
