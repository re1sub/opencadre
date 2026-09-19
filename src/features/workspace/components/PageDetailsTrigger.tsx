import { formatTimestamp } from "#/utils/date";
import { useLastEdit } from "../hooks/useLastEdit";
import type { Page, WorkspaceMember } from "../types";
import {
	editedBadge,
	tooltipCard,
	tooltipLabel,
	tooltipTime,
	tooltipTimeSpaced,
} from "./pageDetails.css";

interface PageDetailsTriggerProps {
	page: Page;
	members: WorkspaceMember[];
	isTooltipButton?: boolean;
}

const PageDetailsTrigger = (props: PageDetailsTriggerProps) => {
	const lastEdit = useLastEdit(() => props.page.id);

	const ownerName = () =>
		props.members.find((m) => m.id === props.page.ownerId)?.name ?? "Unknown";

	const lastEditorName = () => {
		const e = lastEdit();
		if (!e) return "No edits yet";
		return props.members.find((m) => m.id === e.userId)?.name ?? "Unknown";
	};

	return (
		<>
			<wa-button
				id="edited-badge"
				class={props.isTooltipButton ? editedBadge : ""}
				appearance="plain"
				variant="neutral"
				data-drawer="open page-info-drawer"
			>
				{props.isTooltipButton ? (
					`Edited ${formatTimestamp(props.page.updatedAt)}`
				) : (
					<>
						<wa-icon name="clock" slot="start"></wa-icon> Page updates
					</>
				)}
			</wa-button>
			<wa-tooltip
				for={props.isTooltipButton ? "edited-badge" : ""}
				placement="bottom"
				trigger="hover"
			>
				<div class={tooltipCard}>
					<div>
						<div class={tooltipLabel}>Created by {ownerName()}</div>
						<div class={tooltipTimeSpaced}>
							{formatTimestamp(props.page.createdAt)}
						</div>
					</div>
					<div>
						<div class={tooltipLabel}>Last edited by {lastEditorName()}</div>
						<div class={tooltipTime}>
							{lastEdit() ? formatTimestamp(lastEdit()!.at) : ""}
						</div>
					</div>
				</div>
			</wa-tooltip>
		</>
	);
};

export default PageDetailsTrigger;
