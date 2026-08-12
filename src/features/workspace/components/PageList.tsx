import { For, Show } from "solid-js";
import { PAGE_KIND_META, type Page } from "../types";
import {
	pageButton,
	pageList,
	pageMenuTrigger,
	pageRow,
} from "./workspace.css";

interface PageListProps {
	pages: Page[];
	activePageId: () => string | null;
	onSelect: (id: string) => void;
	onRequestDelete: (id: string) => void;
}

const PageList = (props: PageListProps) => {
	const isActive = (id: string) => id === props.activePageId();

	return (
		<Show when={props.pages.length > 0}>
			<ul class={pageList}>
				<For each={props.pages}>
					{(entry) => (
						<li class={pageRow}>
							<wa-button
								variant={isActive(entry.id) ? "brand" : "neutral"}
								appearance={isActive(entry.id) ? "filled" : "plain"}
								class={pageButton}
								onClick={() => props.onSelect(entry.id)}
							>
								<wa-icon
									slot="start"
									name={PAGE_KIND_META[entry.kind].icon}
									label={PAGE_KIND_META[entry.kind].iconLabel}
								></wa-icon>
								{entry.title}
							</wa-button>
							<wa-dropdown on:wa-select={() => props.onRequestDelete(entry.id)}>
								<wa-button
									slot="trigger"
									variant={isActive(entry.id) ? "brand" : "neutral"}
									appearance="plain"
									size="xs"
									class={pageMenuTrigger}
									aria-label={`Options for ${entry.title}`}
								>
									<wa-icon name="ellipsis-vertical"></wa-icon>
								</wa-button>

								<wa-dropdown-item>
									<wa-icon slot="icon" name="trash-2"></wa-icon>
									Delete page
								</wa-dropdown-item>
							</wa-dropdown>
						</li>
					)}
				</For>
			</ul>
		</Show>
	);
};

export default PageList;
