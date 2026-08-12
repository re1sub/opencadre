import { Show } from "solid-js";
import { KanbanBoard } from "#/features/kanban/KanbanBoard";
import { MarkdownEditor } from "#/features/markdown/MarkdownEditor";
import { TablePage } from "#/features/table/TablePage";
import type { Page } from "../types";

interface PageViewProps {
	page: Page | null;
	onChangeContent?: (pageId: string, content: string) => void;
}

export function PageView(props: PageViewProps) {
	const activeId = () => props.page?.id ?? null;

	return (
		<Show when={activeId()} keyed fallback={<MarkdownEditor content="" />}>
			{(id) => {
				const page = props.page;
				if (!page || page.id !== id) return null;

				if (page.kind === "kanban") {
					return <KanbanBoard pageId={page.id} />;
				}

				if (page.kind === "table") {
					return (
						<TablePage
						// pageId={page.id}
						// content={page.content}
						// onContentChange={(content) =>
						// 	props.onChangeContent?.(page.id, content)
						// }
						/>
					);
				}

				return <MarkdownEditor content={page.content} />;
			}}
		</Show>
	);
}
