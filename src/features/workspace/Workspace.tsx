import type WaPage from "@awesome.me/webawesome/dist/components/page/page.js";
import { useNavigate } from "@solidjs/router";
import { createSignal, Show } from "solid-js";
import { useAuth } from "#/features/auth/AuthContext";
import ConfirmDialog from "#/features/ui/ConfirmDialog";
import EditableText from "#/features/ui/EditableText";
import { uid } from "#/utils/uid";
import PageView from "./components/PageView";
import TrashDialog from "./components/TrashDialog";
import WorkspaceFooter from "./components/WorkspaceFooter";
import WorkspaceHeader from "./components/WorkspaceHeader";
import WorkspaceSidebar from "./components/WorkspaceSidebar";
import {
	mainContent,
	mainHeader,
	page,
	pageButton,
	pageTitleStyle,
	sidebarResizer,
} from "./components/workspace.css";
import { GETTING_STARTED_MARKDOWN } from "./constants/gettingStarted";
import { usePages } from "./hooks/usePages";
import { useSidebarResize } from "./hooks/useSidebarResize";
import { useSwipeDrawer } from "./hooks/useSwipeDrawer";
import { useTrash } from "./hooks/useTrash";
import { useWorkspaces } from "./hooks/useWorkspaces";
import type { Page, PageKind, Workspace as WorkspaceType } from "./types";

const createDefaultSeed = () => {
	const ws1: WorkspaceType = {
		id: uid(),
		name: "Personal",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};
	const ws2: WorkspaceType = {
		id: uid(),
		name: "Work",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	const pages: Page[] = [
		{
			id: uid(),
			workspaceId: ws1.id,
			title: "Getting Started",
			kind: "markdown",
			content: GETTING_STARTED_MARKDOWN,
		},
		{
			id: uid(),
			workspaceId: ws1.id,
			title: "Kanban Board",
			kind: "kanban",
			content: "",
		},
		{
			id: uid(),
			workspaceId: ws1.id,
			title: "Sample Table",
			kind: "table",
			content: "",
		},
		{
			id: uid(),
			workspaceId: ws2.id,
			title: "Sprint Tasks",
			kind: "kanban",
			content: "",
		},
		{
			id: uid(),
			workspaceId: ws2.id,
			title: "Meeting Notes",
			kind: "markdown",
			content: "",
		},
	];

	return { workspaces: [ws1, ws2], pages };
};

const Workspace = () => {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const [error, setError] = createSignal<string | null>(null);

	// Ref to wa-page element to pierce Shadow DOM for internal drawer
	let pageRef!: WaPage;

	const seed = createDefaultSeed();
	const wsHook = useWorkspaces(seed.workspaces);
	const pagesHook = usePages(
		seed.pages,
		wsHook.activeWorkspaceId,
		wsHook.setActiveWorkspaceId,
	);
	const trashHook = useTrash(wsHook.setWorkspaces, pagesHook.setAllPages);

	const [deleteTarget, setDeleteTarget] = createSignal<
		| { kind: "page"; id: string; title: string }
		| { kind: "workspace"; id: string; title: string }
		| null
	>(null);
	const [isTrashOpen, setIsTrashOpen] = createSignal(false);

	const selectWorkspace = (id: string) => {
		wsHook.setActiveWorkspaceId(id);
		const firstPage = pagesHook.allPages().find((p) => p.workspaceId === id);
		navigate(firstPage ? `/workspace/p/${firstPage.id}` : "/workspace");
	};

	const handleAddWorkspace = () => {
		const ws = wsHook.addWorkspace();
		const initPage: Page = {
			id: uid(),
			workspaceId: ws.id,
			title: "Getting Started",
			kind: "markdown" as PageKind,
			content: GETTING_STARTED_MARKDOWN,
		};
		pagesHook.setAllPages((prev) => [...prev, initPage]);
		navigate(`/workspace/p/${initPage.id}`);
	};

	const handleDeleteWorkspace = (id: string) => {
		const pagesToDelete = pagesHook
			.allPages()
			.filter((p) => p.workspaceId === id);
		const removedWs = wsHook.removeWorkspace(id);

		if (removedWs) {
			trashHook.moveToTrash({
				kind: "workspace",
				workspace: removedWs,
				pages: pagesToDelete,
			});
			pagesHook.setAllPages((prev) => prev.filter((p) => p.workspaceId !== id));
		}
	};

	const handleDeletePage = (id: string) => {
		const removedPage = pagesHook.removePage(id);
		if (removedPage) {
			trashHook.moveToTrash({ kind: "page", page: removedPage });
		}
	};

	const handleSignOut = async () => {
		setError(null);
		try {
			await logout();
		} catch (authError: unknown) {
			setError(
				authError instanceof Error
					? authError.message
					: "An unexpected error occurred. Please try again.",
			);
		}
	};

	const {
		sidebarWidth,
		sidebarCollapsed,
		setSidebarCollapsed,
		sidebarHovered,
		setSidebarHovered,
		onResizePointerDown,
		inNav,
	} = useSidebarResize();

	const openDrawer = () => {
		setSidebarHovered(false);

		if (!pageRef.navOpen) {
			pageRef.showNavigation();
		}
	};

	const closeDrawer = () => {
		setSidebarHovered(false);

		if (pageRef.navOpen) {
			pageRef.hideNavigation();
		}
	};

	useSwipeDrawer({
		isOpen: () => pageRef.navOpen,
		onOpen: openDrawer,
		onClose: closeDrawer,
		edgeThreshold: 50,
		swipeDistance: 20,
	});

	return (
		<wa-page
			ref={(el) => (pageRef = el)}
			navigation-placement="start"
			class={`${page} ${sidebarCollapsed() ? "sidebar-collapsed" : ""}`}
			style={{
				"--menu-width":
					sidebarCollapsed() && !sidebarHovered()
						? "0px"
						: `${sidebarWidth()}px`,
			}}
			// @ts-expect-error: WA doesn't include onPointerOver/Out types
			onPointerOver={(e: PointerEvent) => {
				if (sidebarCollapsed() && inNav(e.target)) setSidebarHovered(true);
			}}
			onPointerOut={(e: PointerEvent) => {
				if (inNav(e.target) && !inNav(e.relatedTarget))
					setSidebarHovered(false);
			}}
		>
			<nav
				slot="main-header"
				class={mainHeader}
				style={{
					padding: sidebarCollapsed() ? 0 : "",
				}}
			>
				<wa-button
					appearance="plain"
					variant="neutral"
					data-toggle-nav
					style={{
						padding: "0",
						display: sidebarCollapsed() ? "block" : "",
					}}
					onClick={() => setSidebarCollapsed(false)}
				>
					<wa-icon name="menu" label="Toggle navigation"></wa-icon>
				</wa-button>

				<div
					style={{
						"margin-right": "auto",
						"--wa-form-control-padding-inline": "var(--wa-space-2xs)",
					}}
				>
					<wa-button variant="neutral" appearance="plain" class={pageButton}>
						{pagesHook.activePage()?.title || "Untitled"}
					</wa-button>
				</div>
				<wa-copy-button
					value={
						pagesHook.activePage()
							? `${window.location.origin}/workspace/p/${pagesHook.activePage()?.id}`
							: ""
					}
					copy-label="Copy page link"
					success-label="Page link copied!"
				>
					<wa-icon slot="copy-icon" name="link" variant="regular"></wa-icon>
				</wa-copy-button>
			</nav>

			<WorkspaceHeader
				collapsed={sidebarCollapsed}
				activeWorkspace={wsHook.activeWorkspace}
				onToggleCollapsed={() => {
					if (sidebarCollapsed()) {
						setSidebarCollapsed(false);
					} else {
						setSidebarCollapsed(true);
					}
				}}
				onRename={(name) => {
					const active = wsHook.activeWorkspace();
					if (active) wsHook.renameWorkspace(active.id, name);
				}}
				onSelectWorkspace={selectWorkspace}
				workspaces={wsHook.workspaces()}
				onAddWorkspace={handleAddWorkspace}
			/>

			<WorkspaceSidebar
				pages={pagesHook.activePages()}
				activePageId={pagesHook.activePageId}
				onAddPage={pagesHook.addPage}
				onRequestDeletePage={(id) => {
					const found = pagesHook
						.activePages()
						.find((entry) => entry.id === id);
					if (found)
						setDeleteTarget({ kind: "page", id: found.id, title: found.title });
				}}
				onReorder={pagesHook.reorderPages}
			/>

			<WorkspaceFooter
				user={user}
				error={error}
				onSignOut={handleSignOut}
				onOpenTrash={() => setIsTrashOpen(true)}
			/>

			<main class={mainContent}>
				<div
					class={sidebarResizer}
					style={{
						"background-color":
							sidebarCollapsed() && !sidebarHovered()
								? "var(--wa-color-surface-border)"
								: "",
						height: sidebarCollapsed() ? "50vh" : "auto",
						top: sidebarCollapsed() ? "50%" : 0,
						width: sidebarCollapsed() ? "6px" : "3px",
						"border-radius": sidebarCollapsed() ? "0 5px 5px 0" : "",
						transform: sidebarCollapsed() ? "translateY(-50%)" : "",
						position: sidebarCollapsed() ? "fixed" : "absolute",
						cursor: sidebarCollapsed() ? "auto" : "col-resize",
					}}
					onPointerEnter={() => {
						if (sidebarCollapsed()) setSidebarHovered(true);
					}}
					onPointerDown={onResizePointerDown}
				/>

				<Show when={pagesHook.activePage()}>
					{(active) => {
						const [isEditingTitle, setIsEditingTitle] = createSignal(false);

						return (
							<div
								style={{
									"padding-bottom": "var(--wa-space-3xs)",
									"margin-bottom": "var(--wa-space-s)",
									"border-bottom":
										"var(--wa-border-width-s) var(--wa-border-style) var(--wa-color-surface-border)",
									cursor: "text",
								}}
							>
								<Show
									when={!isEditingTitle()}
									fallback={
										<EditableText
											value={active().title}
											onChange={(title) =>
												pagesHook.renamePage(active().id, title)
											}
											onConfirm={() => setIsEditingTitle(false)}
											onCancel={() => setIsEditingTitle(false)}
											class={pageTitleStyle}
											ariaLabel="Page title"
											autoFocus
										/>
									}
								>
									<h1
										class={pageTitleStyle}
										onClick={() => setIsEditingTitle(true)}
										style={{
											"padding-top": "2px",
											"white-space": "pre-wrap",
										}}
									>
										{active().title}
									</h1>
								</Show>
							</div>
						);
					}}
				</Show>

				<PageView
					page={pagesHook.activePage()}
					onChangeContent={pagesHook.updatePageContent}
				/>
			</main>

			<Show when={deleteTarget()} keyed>
				{(target) => (
					<ConfirmDialog
						label={
							target.kind === "workspace" ? "Delete workspace" : "Delete page"
						}
						message={
							target.kind === "workspace"
								? `Are you sure you want to delete "${target.title}" and all its pages? They will be moved to Trash and can be restored.`
								: `Are you sure you want to delete "${target.title}"? It will be moved to Trash and can be restored.`
						}
						onConfirm={() => {
							if (target.kind === "workspace") {
								handleDeleteWorkspace(target.id);
							} else {
								handleDeletePage(target.id);
							}
						}}
						onClose={() => setDeleteTarget(null)}
					/>
				)}
			</Show>

			<Show when={isTrashOpen()}>
				<TrashDialog
					entries={trashHook.trash()}
					onRestore={trashHook.restoreEntry}
					onPurge={trashHook.purgeEntry}
					onEmptyTrash={trashHook.emptyTrash}
					onClose={() => setIsTrashOpen(false)}
				/>
			</Show>
		</wa-page>
	);
};

export default Workspace;
