import { For, Show } from "solid-js";
import ActionCard from "#/features/ui/ActionCard";
import { PAGE_TEMPLATES } from "../constants/templates";
import { PAGE_KIND_META, type Page, type PageKind } from "../types";
import {
	actionGrid,
	emptyHint,
	heading,
	stats,
	wrapper,
} from "./workspaceHome.css";

interface WorkspaceHomeProps {
	workspaceName?: string;
	pages: Page[];
	recentPages: Page[];
	memberCount: number;
	onAddPage: (kind: PageKind) => void;
	onCreateFromTemplate: (templateId: string) => void;
	onOpenPage: (id: string) => void;
}

const WorkspaceHome = (props: WorkspaceHomeProps) => {
	const showRecent = () => props.recentPages.length > 0;
	const listToShow = () => (showRecent() ? props.recentPages : props.pages);

	return (
		<div class={wrapper}>
			<div>
				<h1 class={heading}>{props.workspaceName || "This Workspace"}</h1>
				<p class={stats}>
					{props.pages.length} {props.pages.length === 1 ? "page" : "pages"} ·{" "}
					{props.memberCount} {props.memberCount === 1 ? "member" : "members"}
				</p>
			</div>

			<Show when={listToShow().length > 0}>
				<section>
					<h4>{showRecent() ? "Recently visited" : "All pages"}</h4>

					<div class={actionGrid}>
						<For each={listToShow()}>
							{(page) => (
								<ActionCard
									icon={PAGE_KIND_META[page.kind].icon}
									iconLabel={PAGE_KIND_META[page.kind].iconLabel}
									label={page.title}
									hint={PAGE_KIND_META[page.kind].label}
									onClick={() => props.onOpenPage(page.id)}
								/>
							)}
						</For>
					</div>
				</section>
			</Show>

			<section>
				<h4>Quick actions</h4>

				<div class={actionGrid}>
					<For each={Object.entries(PAGE_KIND_META)}>
						{([kind, meta]) => (
							<ActionCard
								icon={meta.icon}
								iconLabel={meta.iconLabel}
								label={meta.label}
								hint={`Create a new ${kind === "markdown" ? "page" : kind}.`}
								onClick={() => props.onAddPage(kind as PageKind)}
							/>
						)}
					</For>
				</div>
			</section>

			<section>
				<h4>Templates</h4>

				<div class={actionGrid}>
					<For each={PAGE_TEMPLATES}>
						{(template) => (
							<ActionCard
								icon={template.icon}
								iconLabel={`Create ${template.label}`}
								label={template.label}
								hint={template.description}
								onClick={() => props.onCreateFromTemplate(template.id)}
							/>
						)}
					</For>
				</div>
			</section>

			<Show when={props.pages.length === 0}>
				<p class={emptyHint}>
					Your workspace is empty. Create a page or board to get started.
				</p>
			</Show>
		</div>
	);
};

export default WorkspaceHome;
