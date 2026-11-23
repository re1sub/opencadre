import { Show } from "solid-js";
import { Portal } from "solid-js/web";
import { useAiAssistant } from "../hooks/useAiAssistant";
import {
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
	isMobile?: () => boolean;
}

const AiAssistantPanel = (props: AiAssistantPanelProps) => {
	const { open, close } = useAiAssistant();
	const mobile = () => props.isMobile?.() ?? false;

	const content = () => (
		<>
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
			when={mobile()}
			fallback={
				<aside
					id="ai-assistant-panel"
					slot="aside"
					class={`${panel} ${open() ? "" : panelClosed}`}
					aria-label="AI Assistant"
					aria-hidden={!open()}
					inert={!open()}
				>
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
					style={{ "--size": "min(22rem, 90vw)" }}
					on:wa-after-hide={close}
				>
					{content()}
				</wa-drawer>
			</Portal>
		</Show>
	);
};

export default AiAssistantPanel;
