import { lazy, Match, Show, Suspense, Switch } from "solid-js";
import Skeleton from "#/features/ui/Skeleton";
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
		<Show when={activeId()} keyed fallback={null}>
			{(id) => {
				const page = props.page;
				if (!page || page.id !== id) return null;

				return (
					<Switch
						fallback={
							<Suspense fallback={<Skeleton />}>
								<MarkdownEditor
									content={page.content}
									onUpdate={(content) =>
										props.onChangeContent?.(page.id, content)
									}
								/>
							</Suspense>
						}
					>
						<Match when={page.kind === "kanban"}>
							<Suspense fallback={<Skeleton />}>
								<KanbanBoard
									pageId={page.id}
									workspaceId={page.workspaceId}
									content={page.content}
									onChangeContent={(content) =>
										props.onChangeContent?.(page.id, content)
									}
								/>
							</Suspense>
						</Match>
						<Match when={page.kind === "table"}>
							<Suspense fallback={<Skeleton />}>
								<TablePage
									content={page.content}
									title={page.title}
									onChangeContent={(content) =>
										props.onChangeContent?.(page.id, content)
									}
								/>
							</Suspense>
						</Match>
					</Switch>
				);
			}}
		</Show>
	);
};

export default PageView;
