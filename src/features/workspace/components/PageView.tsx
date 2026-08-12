import { lazy, Show, Suspense } from "solid-js";
import LoadingSpinner from "#/features/ui/LoadingSpinner";
import type { Page } from "../types";

interface PageViewProps {
	page: Page | null;
	onChangeContent?: (pageId: string, content: string) => void;
}

const MarkdownEditor = lazy(() => import("#/features/markdown/MarkdownEditor"));
const KanbanBoard = lazy(() => import("#/features/kanban/KanbanBoard"));
const TablePage = lazy(() => import("#/features/table/TablePage"));

const PageView = (props: PageViewProps) => {
	const activeId = () => props.page?.id ?? null;

	return (
		<Show when={activeId()} keyed fallback={<MarkdownEditor content="" />}>
			{(id) => {
				const page = props.page;
				if (!page || page.id !== id) return null;

				if (page.kind === "kanban") {
					return (
						<Suspense fallback={<LoadingSpinner />}>
							<KanbanBoard pageId={page.id} />
						</Suspense>
					);
				}

				if (page.kind === "table") {
					return (
						<Suspense fallback={<LoadingSpinner />}>
							<TablePage
							// pageId={page.id}
							// content={page.content}
							// onContentChange={(content) =>
							// 	props.onChangeContent?.(page.id, content)
							// }
							/>
						</Suspense>
					);
				}

				return <MarkdownEditor content={page.content} />;
			}}
		</Show>
	);
};

export default PageView;
