import { RestrictToVerticalAxis } from "@dnd-kit/abstract/modifiers";
import { RestrictToElement } from "@dnd-kit/dom/modifiers";
import { DragDropProvider } from "@dnd-kit/solid";
import { For, Show } from "solid-js";
import { useDragReorder } from "#/utils/useDragReorder";
import type { Page } from "../types";
import SortablePageItem from "./SortablePageItem";
import { pageList } from "./workspace.css";

interface PageListProps {
	pages: Page[];
	activePageId: () => string | null;
	onRequestDelete: (id: string) => void;
	onReorder: (pageId: string, newIndex: number) => void;
}

const PageList = (props: PageListProps) => {
	const onDragEnd = useDragReorder(
		() => props.pages,
		(next, movedId) => {
			const newIndex = next.findIndex((p) => p.id === movedId);
			if (newIndex !== -1) props.onReorder(movedId, newIndex);
		},
	);

	return (
		<Show when={props.pages.length > 0}>
			<DragDropProvider
				modifiers={[
					RestrictToVerticalAxis,
					RestrictToElement.configure({
						element: (operation) =>
							operation.source?.element?.parentElement ?? null,
					}),
				]}
				onDragEnd={onDragEnd}
			>
				<ul class={pageList}>
					<For each={props.pages}>
						{(entry, index) => (
							<SortablePageItem
								entry={entry}
								index={index()}
								isActive={entry.id === props.activePageId()}
								onRequestDelete={props.onRequestDelete}
							/>
						)}
					</For>
				</ul>
			</DragDropProvider>
		</Show>
	);
};

export default PageList;
