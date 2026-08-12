import type { Page, PageKind } from "../types";
import AddPageButton from "./AddPageButton";
import PageList from "./PageList";
import { sidebar } from "./workspace.css";

interface WorkspaceSidebarProps {
	pages: Page[];
	activePageId: () => string | null;
	onAddPage: (kind: PageKind) => void;
	onSelectPage: (id: string) => void;
	onRequestDelete: (id: string) => void;
}

const WorkspaceSidebar = (props: WorkspaceSidebarProps) => {
	return (
		<nav slot="navigation" class={sidebar}>
			<AddPageButton onAddPage={props.onAddPage} />

			<PageList
				pages={props.pages}
				activePageId={props.activePageId}
				onSelect={props.onSelectPage}
				onRequestDelete={props.onRequestDelete}
			/>
		</nav>
	);
};

export default WorkspaceSidebar;
