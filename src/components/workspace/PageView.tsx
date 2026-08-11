import { Show } from "solid-js";
import { KanbanBoard } from "#/components/KanbanBoard";
import { MarkdownEditor } from "#/components/MarkdownEditor";
import type { Page } from "./types";

interface PageViewProps {
	page: Page | null;
}

export function PageView(props: PageViewProps) {
	return (
		<Show when={props.page} keyed fallback={<MarkdownEditor content="" />}>
			{(active) =>
				active.kind === "kanban" ? (
					<KanbanBoard pageId={active.id} />
				) : (
					<MarkdownEditor content={active.content} />
				)
			}
		</Show>
	);
}
