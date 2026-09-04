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

				// Read `props.page` reactively in the JSX below (not via the
				// frozen `page` const) so content edits on the SAME page flow to
				// the editors without remounting them.
				return (
					<Switch
						fallback={
							<Suspense fallback={<Skeleton />}>
								<MarkdownEditor
									pageId={id}
									workspaceId={props.page?.workspaceId}
									content={props.page?.content ?? ""}
									onUpdate={(content) => props.onChangeContent?.(id, content)}
								/>
							</Suspense>
						}
					>
						<Match when={props.page?.kind === "kanban"}>
							<Suspense fallback={<Skeleton />}>
								<KanbanBoard
									pageId={id}
									workspaceId={props.page?.workspaceId}
									content={props.page?.content ?? ""}
									onChangeContent={(content) =>
										props.onChangeContent?.(id, content)
									}
								/>
							</Suspense>
						</Match>
						<Match when={props.page?.kind === "table"}>
							<Suspense fallback={<Skeleton />}>
								<TablePage
									pageId={id}
									workspaceId={props.page?.workspaceId}
									content={props.page?.content ?? ""}
									title={props.page?.title}
									onChangeContent={(content) =>
										props.onChangeContent?.(id, content)
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
