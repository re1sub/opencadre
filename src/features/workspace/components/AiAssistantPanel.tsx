import { Show } from "solid-js";
import { Portal } from "solid-js/web";
import { useAiAssistant } from "../hooks/useAiAssistant";
import { useAiSidebarResize } from "../hooks/useAiSidebarResize";
import {
	aiSidebarResizer,
	body,
	bodyText,
	bodyTitle,
	closeButton,
	composerActions,
	composerBox,
	disclaimer,
	header,
	panel,
	panelClosed,
} from "./aiAssistantPanel.css";

interface AiAssistantPanelProps {
	useDrawer?: () => boolean;
}

const AiAssistantPanel = (props: AiAssistantPanelProps) => {
	const { open, close } = useAiAssistant();
	const { width, minWidth, maxWidth, onResizePointerDown, onResizeKeyDown } =
		useAiSidebarResize();
	const drawer = () => props.useDrawer?.() ?? false;

	const customHeader = () => (
		<div class={header}>
			<wa-button
				appearance="plain"
				variant="neutral"
				aria-label="Close AI Assistant"
				onClick={close}
				class={closeButton}
			>
				<wa-icon name="x" label="Close"></wa-icon>
			</wa-button>
		</div>
	);

	const content = () => (
		<>
			<div class={body}>
				<wa-icon name="sparkles" label="AI Assistant"></wa-icon>
				<h2 class={bodyTitle}>How can I help?</h2>
				<p class={bodyText}>
					Ask questions, give a task, explore ideas, or get help with your
					current workspace.
				</p>
			</div>

			<div>
				<div class={composerBox}>
					<wa-textarea
						placeholder="Coming soon..."
						rows={3}
						resize="none"
						disabled
					></wa-textarea>
					<div class={composerActions}>
						<wa-button
							type="button"
							variant="neutral"
							appearance="plain"
							aria-label="Send prompt"
							size="s"
							tabIndex={0}
						>
							<wa-icon name="plus" label="Send"></wa-icon>
						</wa-button>
						<wa-button
							type="button"
							variant="neutral"
							appearance="plain"
							aria-label="Send prompt"
							size="s"
							tabIndex={0}
						>
							<wa-icon name="send-horizontal" label="Send"></wa-icon>
						</wa-button>
					</div>
				</div>
				<p class={disclaimer}>
					AI can make mistakes. Verify important information.
				</p>
			</div>
		</>
	);

	return (
		<Show
			when={drawer()}
			fallback={
				<aside
					id="ai-assistant-panel"
					slot="aside"
					class={`${panel} ${open() ? "" : panelClosed}`}
					aria-label="AI Assistant"
					aria-hidden={!open()}
					inert={!open()}
				>
					<hr
						class={aiSidebarResizer}
						aria-label="Resize AI Assistant"
						aria-controls="ai-assistant-panel"
						aria-orientation="vertical"
						aria-valuemin={minWidth}
						aria-valuemax={maxWidth()}
						aria-valuenow={width()}
						tabIndex={open() ? 0 : -1}
						onPointerDown={onResizePointerDown}
						onKeyDown={onResizeKeyDown}
					/>
					{customHeader()}
					{content()}
				</aside>
			}
		>
			<Portal>
				<wa-drawer
					id="ai-assistant-panel"
					label="AI Assistant"
					placement="end"
					open={open()}
					light-dismiss
					style={{ "--size": `min(${width()}px, 90vw)` }}
					on:wa-after-hide={close}
				>
					{content()}
				</wa-drawer>
			</Portal>
		</Show>
	);
};

export default AiAssistantPanel;
