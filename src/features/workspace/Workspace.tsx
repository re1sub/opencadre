import type WaPage from "@awesome.me/webawesome/dist/components/page/page.js";
import { useNavigate } from "@solidjs/router";
import { createSignal, Show } from "solid-js";
import { useAuth } from "#/features/auth/AuthContext";
import ConfirmDialog from "#/features/ui/ConfirmDialog";
import EditableText from "#/features/ui/EditableText";
import { formatTimestamp } from "#/utils/date";
import { useWorkspaceRealtime } from "#/utils/realtime/useWorkspaceRealtime";
import { useHotkey } from "#/utils/useHotkey";
import LoadingSpinner from "../ui/LoadingSpinner";
import CreateWorkspace from "./components/CreateWorkspace";
import NewWorkspaceDialog from "./components/NewWorkspaceDialog";
import PageView from "./components/PageView";
import TrashDialog from "./components/TrashDialog";
import WorkspaceFooter from "./components/WorkspaceFooter";
import WorkspaceHeader from "./components/WorkspaceHeader";
import WorkspaceHome from "./components/WorkspaceHome";
import WorkspaceSidebar from "./components/WorkspaceSidebar";
import {
	editedBadge,
	mainContent,
	mainHeader,
	page,
	pageButton,
	pageTitlePlaceholder,
	pageTitleStyle,
	sidebarResizer,
} from "./components/workspace.css";
import { PAGE_KIND_LOADERS } from "./constants/pageViewLoaders";
import { PAGE_TEMPLATES } from "./constants/templates";
import type { AddPageOptions } from "./hooks/usePagesAdapter";
import { usePagesAdapter } from "./hooks/usePagesAdapter";
import { useShortcuts } from "./hooks/useShortcuts";
import { useSidebarResize } from "./hooks/useSidebarResize";
import { useSwipeDrawer } from "./hooks/useSwipeDrawer";
import { useTrash } from "./hooks/useTrash";
import { useWorkspaceAdapter } from "./hooks/useWorkspaceAdapter";
import { useWorkspaceMembersAdapter } from "./hooks/useWorkspaceMembersAdapter";
import type { PageKind } from "./types";

const Workspace = () => {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const [error, setError] = createSignal<string | null>(null);

	// Ref to wa-page element to pierce Shadow DOM for internal drawer
	let pageRef!: WaPage;

	const wsHook = useWorkspaceAdapter();
	const pagesHook = usePagesAdapter(
		wsHook.activeWorkspaceId,
		wsHook.setActiveWorkspaceId,
	);
	const trashHook = useTrash(wsHook.setWorkspaces, pagesHook.setAllPages);
	const membersHook = useWorkspaceMembersAdapter(wsHook.activeWorkspaceId);

	// Realtime: one channel per active workspace; pages scoped by membership.
	useWorkspaceRealtime({
		workspaceId: wsHook.activeWorkspaceId,
		getPageIds: () =>
			pagesHook
				.allPages()
				.filter((p) => p.workspaceId === wsHook.activeWorkspaceId())
				.map((p) => p.id),
	});

	const [deleteTarget, setDeleteTarget] = createSignal<
		| { kind: "page"; id: string; title: string }
		| { kind: "workspace"; id: string; title: string }
		| null
	>(null);
	const [isTrashOpen, setIsTrashOpen] = createSignal(false);
	const [isNewWorkspaceOpen, setIsNewWorkspaceOpen] = createSignal(false);

	const selectWorkspace = (id: string) => {
		wsHook.setActiveWorkspaceId(id);
		const firstPage = pagesHook.allPages().find((p) => p.workspaceId === id);
		navigate(firstPage ? `/workspace/p/${firstPage.id}` : "/workspace");
	};

	const handleAddWorkspace = async (name?: string) => {
		const ws = await wsHook.addWorkspace(name);
		if (!ws) return;
		navigate("/workspace");
		wsHook.setActiveWorkspaceId(ws.id);
	};

	const handleCreateNewWorkspace = async (name: string) => {
		await handleAddWorkspace(name);
		setIsNewWorkspaceOpen(false);
	};

	const handleAddPage = async (kind: PageKind, options?: AddPageOptions) => {
		await PAGE_KIND_LOADERS[kind]();
		return pagesHook.addPage(kind, options);
	};

	const handleCreateFromTemplate = async (templateId: string) => {
		const template = PAGE_TEMPLATES.find((entry) => entry.id === templateId);
		if (!template) return;
		await handleAddPage(template.kind, {
			title: template.title,
			content: template.content,
		});
	};

	const handleDeleteWorkspace = async (id: string) => {
		const pagesToDelete = pagesHook
			.allPages()
			.filter((p) => p.workspaceId === id);
		const removedWs = await wsHook.removeWorkspace(id);

		if (removedWs) {
			trashHook.moveToTrash({
				kind: "workspace",
				workspace: removedWs,
				pages: pagesToDelete,
			});
			pagesHook.setAllPages((prev) => prev.filter((p) => p.workspaceId !== id));
		}
	};

	const handleEditWorkspace = async (
		id: string,
		fields: {
			name?: string;
			description?: string | null;
			defaultPageKind?: PageKind;
		},
	) => {
		await wsHook.updateWorkspace(id, fields);
	};

	const handlePermanentDeleteWorkspace = async (id: string) => {
		const removed = await wsHook.removeWorkspace(id);
		if (removed) {
			pagesHook.setAllPages((prev) => prev.filter((p) => p.workspaceId !== id));
		}
	};

	const handleLeaveWorkspace = async (id: string) => {
		const me = user()?.id;
		if (me) await membersHook.removeMember(me);
		const remaining = wsHook.workspaces().filter((w) => w.id !== id);
		wsHook.setWorkspaces(remaining);
		if (wsHook.activeWorkspaceId() === id) {
			wsHook.setActiveWorkspaceId(remaining[0]?.id ?? "");
		}
	};

	const handleDeletePage = async (id: string) => {
		const removedPage = await pagesHook.removePage(id);
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

	const { shortcuts } = useShortcuts();
	useHotkey(
		() => {
			const config = shortcuts()["toggle-sidebar"];
			return config.enabled ? config.combo : null;
		},
		() => setSidebarCollapsed((v) => !v),
	);
	useHotkey(
		() => {
			const config = shortcuts()["new-page"];
			return config.enabled ? config.combo : null;
		},
		() => {
			if (!wsHook.activeWorkspace()) return;
			const kind = wsHook.activeWorkspace()?.defaultPageKind ?? "markdown";
			void handleAddPage(kind);
		},
	);

	return (
		<Show when={wsHook.loaded()} fallback={<LoadingSpinner fullscreen />}>
			<Show
				when={wsHook.workspaces().length > 0}
				fallback={
					<CreateWorkspace
						onCreate={handleAddWorkspace}
						onSignOut={handleSignOut}
					/>
				}
			>
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
						ref={(el) => {
							requestAnimationFrame(() => {
								const height = el.getBoundingClientRect().height;
								const finalHeight = height > 1 ? height : 44;

								pageRef?.style.setProperty(
									"--main-header-height",
									`${finalHeight}px`,
								);
							});
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

						<Show when={pagesHook.activePage()}>
							<div
								style={{
									"margin-right": "auto",
									"--wa-form-control-padding-inline": "var(--wa-space-2xs)",
								}}
							>
								<wa-button
									type="button"
									variant="neutral"
									appearance="plain"
									aria-label="Home"
									href="/workspace"
								>
									<wa-icon name="house" label="Home"></wa-icon>
								</wa-button>
								<wa-button
									variant="neutral"
									appearance="plain"
									class={pageButton}
								>
									{pagesHook.activePage()?.title}
								</wa-button>
							</div>
							<span class={editedBadge}>
								Edited{" "}
								{formatTimestamp(pagesHook.activePage()?.updatedAt ?? "")}
							</span>
							<wa-copy-button
								value={`${window.location.origin}/workspace/p/${pagesHook.activePage()?.id}`}
								copy-label="Copy page link"
								success-label="Page link copied!"
							>
								<wa-icon
									slot="copy-icon"
									name="link"
									variant="regular"
								></wa-icon>
							</wa-copy-button>
						</Show>
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
						onAddWorkspace={() => setIsNewWorkspaceOpen(true)}
					/>

					<WorkspaceSidebar
						pages={pagesHook.activePages()}
						activePageId={pagesHook.activePageId}
						defaultKind={wsHook.activeWorkspace()?.defaultPageKind}
						onAddPage={handleAddPage}
						onRequestDeletePage={(id) => {
							const found = pagesHook
								.activePages()
								.find((entry) => entry.id === id);
							if (found)
								setDeleteTarget({
									kind: "page",
									id: found.id,
									title: found.title,
								});
						}}
						onDuplicatePage={pagesHook.duplicatePage}
						onReorder={pagesHook.reorderPages}
					/>

					<WorkspaceFooter
						user={user}
						error={error}
						workspace={wsHook.activeWorkspace}
						onSignOut={handleSignOut}
						onOpenTrash={() => setIsTrashOpen(true)}
						onUpdateWorkspace={handleEditWorkspace}
						onAddPage={pagesHook.addPage}
						onDeleteWorkspace={handlePermanentDeleteWorkspace}
						onLeaveWorkspace={handleLeaveWorkspace}
						pages={pagesHook.activePages}
					/>

					<main class={mainContent}>
						<div
							class={sidebarResizer}
							style={{
								"background-color":
									sidebarCollapsed() && !sidebarHovered()
										? "var(--wa-color-surface-border)"
										: "",
								height: sidebarCollapsed() ? "50vh" : "100vh",
								top: sidebarCollapsed()
									? "50%"
									: pagesHook.activePage()
										? "calc(var(--main-header-height) * -1)"
										: 0,
								width: sidebarCollapsed() ? "6px" : "3px",
								"border-radius": sidebarCollapsed() ? "0 5px 5px 0" : "",
								transform: sidebarCollapsed() ? "translateY(-50%)" : "",
								position: sidebarCollapsed() ? "fixed" : "absolute",
								cursor: sidebarCollapsed() ? "auto" : "col-resize",
								"z-index": sidebarCollapsed() ? 1 : 100,
							}}
							onPointerEnter={() => {
								if (sidebarCollapsed()) setSidebarHovered(true);
							}}
							onPointerDown={onResizePointerDown}
						/>

						<Show
							when={pagesHook.activePage()}
							fallback={
								<WorkspaceHome
									workspaceName={wsHook.activeWorkspace()?.name}
									pages={pagesHook.activePages()}
									recentPages={pagesHook.recentPages()}
									memberCount={membersHook.members().length}
									onAddPage={handleAddPage}
									onCreateFromTemplate={handleCreateFromTemplate}
									onOpenPage={(pageId) => navigate(`/workspace/p/${pageId}`)}
								/>
							}
						>
							{(active) => {
								const [isEditingTitle, setIsEditingTitle] = createSignal(false);

								return (
									<>
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
														"padding-bottom": "4px",
														"white-space": "pre-wrap",
													}}
												>
													{active().title || (
														<span class={pageTitlePlaceholder}>Untitled</span>
													)}
												</h1>
											</Show>
										</div>

										<PageView
											page={active()}
											onChangeContent={pagesHook.updatePageContent}
										/>
									</>
								);
							}}
						</Show>
					</main>

					<Show when={deleteTarget()} keyed>
						{(target) => (
							<ConfirmDialog
								label={
									target.kind === "workspace"
										? "Delete workspace"
										: "Delete page"
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

					<Show when={isNewWorkspaceOpen()}>
						<NewWorkspaceDialog
							onCreate={handleCreateNewWorkspace}
							onClose={() => setIsNewWorkspaceOpen(false)}
						/>
					</Show>
				</wa-page>
			</Show>
		</Show>
	);
};

export default Workspace;
