import type { Page, PageKind } from "../types";
import AddPageButton from "./AddPageButton";
import PageList from "./PageList";
import { sidebar } from "./workspace.css";

interface WorkspaceSidebarProps {
	pages: Page[];
	activePageId: () => string | null;
	defaultKind?: PageKind;
	onAddPage: (kind: PageKind) => void;
	onRequestDeletePage: (id: string) => void;
	onDuplicatePage: (id: string) => void;
	onReorder: (pageId: string, newIndex: number) => void;
}

const WorkspaceSidebar = (props: WorkspaceSidebarProps) => {
	return (
		<nav slot="navigation" class={sidebar}>
			<AddPageButton
				onAddPage={props.onAddPage}
				defaultKind={props.defaultKind}
			/>

			<PageList
				pages={props.pages}
				activePageId={props.activePageId}
				onRequestDelete={props.onRequestDeletePage}
				onDuplicatePage={props.onDuplicatePage}
				onReorder={props.onReorder}
			/>
		</nav>
	);
};

export default WorkspaceSidebar;
