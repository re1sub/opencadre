import type WaPage from "@awesome.me/webawesome/dist/components/page/page.js";
import { createSignal, For, Show } from "solid-js";
import { Portal } from "solid-js/web";
import type { Page, WorkspaceMember } from "../types";
import NotificationsPanel from "./NotificationsPanel";
import PageDetailsTrigger from "./PageDetailsTrigger";
import {
	mainHeader,
	mainHeaderActionsDropdown,
	pageButton,
} from "./workspace.css";

interface WorkspaceMainHeaderProps {
	activePage: () => Page | null | undefined;
	members: () => WorkspaceMember[];
	sidebarCollapsed: () => boolean;
	setSidebarCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
	isMobile: () => boolean;
	pageRef: WaPage;
}

const WorkspaceMainHeader = (props: WorkspaceMainHeaderProps) => {
	const [desktopContainer, setDesktopContainer] =
		createSignal<HTMLDivElement>();
	const [mobileContainer, setMobileContainer] = createSignal<HTMLDivElement>();

	const NAVBAR_ACTIONS = [
		{
			id: "pageDetails",
			component: () => (
				<PageDetailsTrigger
					page={props.activePage()!}
					members={props.members()}
					isTooltipButton={!props.isMobile()}
				/>
			),
		},
	];

	return (
		<nav
			slot="main-header"
			class={mainHeader}
			style={{
				padding: props.sidebarCollapsed() ? 0 : "",
			}}
			ref={(el) => {
				requestAnimationFrame(() => {
					const height = el.getBoundingClientRect().height;
					const finalHeight = height > 1 ? height : 44;

					props.pageRef?.style.setProperty(
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
					display: props.sidebarCollapsed() ? "block" : "",
				}}
				onClick={() => props.setSidebarCollapsed(false)}
			>
				<wa-icon name="menu" label="Toggle navigation"></wa-icon>
			</wa-button>

			<Show when={props.activePage()}>
				<div
					style={{
						"margin-right": "auto",
						"--wa-form-control-padding-inline": "var(--wa-space-2xs)",
					}}
				>
					<wa-button variant="neutral" appearance="plain" class={pageButton}>
						{props.activePage()?.title}
					</wa-button>
				</div>

				<div
					ref={(el) => setDesktopContainer(el)}
					style={{
						display: "flex",
						"justify-content": "center",
						"align-items": "center",
						gap: "var(--wa-space-xs)",
					}}
				/>

				<wa-dropdown
					placement="bottom-start"
					size="s"
					on:wa-after-hide={(e: Event) => e.stopPropagation()}
					on:wa-hide={(e: Event) => e.stopPropagation()}
					class={mainHeaderActionsDropdown}
				>
					<wa-button slot="trigger" size="s" appearance="plain">
						<wa-icon name="ellipsis-vertical" label="Page actions"></wa-icon>
					</wa-button>
					<div ref={(el) => setMobileContainer(el)} />
				</wa-dropdown>

				<For each={NAVBAR_ACTIONS}>
					{(action) => (
						<Show
							when={props.isMobile() ? mobileContainer() : desktopContainer()}
						>
							<Portal
								mount={
									props.isMobile() ? mobileContainer()! : desktopContainer()!
								}
							>
								{props.isMobile() ? (
									<wa-dropdown-item>{action.component()}</wa-dropdown-item>
								) : (
									action.component()
								)}
							</Portal>
						</Show>
					)}
				</For>

				<wa-copy-button
					value={`${window.location.origin}/workspace/p/${props.activePage()?.id}`}
					copy-label="Copy page link"
					success-label="Page link copied!"
				>
					<wa-icon slot="copy-icon" name="link" variant="regular"></wa-icon>
				</wa-copy-button>

				<NotificationsPanel />
			</Show>
		</nav>
	);
};

export default WorkspaceMainHeader;
