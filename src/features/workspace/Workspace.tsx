import type WaPage from "@awesome.me/webawesome/dist/components/page/page.js";
import { useNavigate } from "@solidjs/router";
import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
import { useAuth } from "#/features/auth/AuthContext";
import ConfirmDialog from "#/features/ui/ConfirmDialog";
import EditableText from "#/features/ui/EditableText";
import { useDebouncedPush } from "#/utils/realtime/useDebouncedPush";
import { useWorkspaceRealtime } from "#/utils/realtime/useWorkspaceRealtime";
import { useHotkey } from "#/utils/useHotkey";
import LoadingSpinner from "../ui/LoadingSpinner";
import CreateWorkspace from "./components/CreateWorkspace";
import { card } from "./components/createWorkspace.css";
import NewWorkspaceDialog from "./components/NewWorkspaceDialog";
import PageDetailsDrawer from "./components/PageDetailsDrawer";
import PageView from "./components/PageView";
import TrashDialog from "./components/TrashDialog";
import WorkspaceFooter from "./components/WorkspaceFooter";
import WorkspaceHeader from "./components/WorkspaceHeader";
import WorkspaceHome from "./components/WorkspaceHome";
import WorkspaceMainHeader from "./components/WorkspaceMainHeader";
import WorkspaceSidebar from "./components/WorkspaceSidebar";
import {
	mainContent,
	page,
	pageTitlePlaceholder,
	pageTitleStyle,
	sidebarResizer,
} from "./components/workspace.css";

import { PAGE_KIND_LOADERS } from "./constants/pageViewLoaders";
import { PAGE_TEMPLATES } from "./constants/templates";
import { useNotifications } from "./hooks/useNotifications";
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

	const [isMobile, setIsMobile] = createSignal(window.innerWidth < 768);

	onMount(() => {
		const handleResize = () => setIsMobile(window.innerWidth < 768);
		window.addEventListener("resize", handleResize);
		onCleanup(() => window.removeEventListener("resize", handleResize));
	});

	// Ref to wa-page element to pierce Shadow DOM for internal drawer
	let pageRef!: WaPage;

	const wsHook = useWorkspaceAdapter();
	const pagesHook = usePagesAdapter(
		wsHook.activeWorkspaceId,
		wsHook.setActiveWorkspaceId,
	);
	const trashHook = useTrash(wsHook.setWorkspaces, pagesHook.setAllPages);
	const membersHook = useWorkspaceMembersAdapter(wsHook.activeWorkspaceId);

	createEffect(() => {
		const page = pagesHook.activePage();
		document.title = `${page?.title ? `${page.title} · ` : ""}OpenCadre`;
	});

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
	const [isEditingTitle, setIsEditingTitle] = createSignal(false);

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
		const page = await pagesHook.addPage(kind, options);
		setIsEditingTitle(true);
		return page;
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
	useNotifications();
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

	onMount(() => {
		setTimeout(() => {
			const page = document.querySelector("wa-page") as WaPage | null;
			const drawer = page?.shadowRoot?.querySelector('[part="drawer"]');
			const dialog = drawer?.shadowRoot?.querySelector(
				'[part="dialog"]',
			) as HTMLElement | null;

			if (!dialog) return;

			dialog.style.paddingTop = "env(safe-area-inset-top)";
			dialog.style.paddingBottom = "env(safe-area-inset-bottom)";
		}, 1000);
	});

	return (
		<Show when={wsHook.loaded()} fallback={<LoadingSpinner fullscreen />}>
			<Show
				when={wsHook.workspaces().length > 0}
				fallback={
					<main
						class={page}
						style={{
							display: "flex",
							"align-items": "center",
							"justify-content": "center",
							height: "100vh",
						}}
					>
						<div class={card}>
							<h2 style={{ "font-size": "1.5rem" }}>
								Create your first workspace
							</h2>
							<p
								style={{
									"font-size": "0.875rem",
									color: "var(--wa-color-text-quiet)",
									margin: 0,
								}}
							>
								Get started by creating a workspace for your team or project.
							</p>
							<CreateWorkspace
								onCreate={handleAddWorkspace}
								onSignOut={handleSignOut}
							/>
						</div>
					</main>
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
					<WorkspaceMainHeader
						activePage={pagesHook.activePage}
						members={membersHook.members}
						sidebarCollapsed={sidebarCollapsed}
						setSidebarCollapsed={setSidebarCollapsed}
						isMobile={isMobile}
						pageRef={pageRef}
					/>

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
								const {
									setPush,
									push,
									pushNow: persistTitleNow,
								} = useDebouncedPush(400);

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
														onChange={(title) => {
															const pageId = active().id;
															pagesHook.renamePage(pageId, title);
															setPush(() => {
																void pagesHook.persistPageTitle(pageId, title);
															});
															push();
														}}
														onConfirm={() => {
															persistTitleNow();
															setIsEditingTitle(false);
														}}
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
					<Show when={pagesHook.activePage()}>
						<PageDetailsDrawer
							page={pagesHook.activePage()!}
							members={membersHook.members()}
						/>
					</Show>
				</wa-page>
			</Show>
		</Show>
	);
};

export default Workspace;
