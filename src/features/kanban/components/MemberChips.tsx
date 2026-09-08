import { Index, Show } from "solid-js";
import type { WorkspaceMember } from "#/features/workspace/types";
import { resolveRefs } from "#/utils/array";
import { getInitials } from "#/utils/misc";
import { memberChipsRow } from "./cardDialog.css";

interface MemberChipsProps {
	assigneeIds: string[];
	members: WorkspaceMember[];
	onRemove: (memberId: string) => void;
}

const MemberChips = (props: MemberChipsProps) => {
	const assignedMembers = () =>
		resolveRefs(props.assigneeIds, props.members).filter(
			(member): member is WorkspaceMember => !!member,
		);

	return (
		<Show when={assignedMembers().length}>
			<div class={memberChipsRow}>
				<Index each={assignedMembers()}>
					{(member) => (
						<wa-tag
							with-remove
							aria-label={`Unassign ${member().name}`}
							on:wa-remove={() => props.onRemove(member().id)}
							pill
						>
							<wa-avatar
								initials={getInitials(member().name)}
								label={`Avatar with initials: ${getInitials(member().name)}`}
								style={{
									"--size": "20px",
									"background-color":
										member().color ?? "var(--wa-color-neutral-400)",
									color: "var(--wa-color-text-normal)",
								}}
							></wa-avatar>

							{member().name}
						</wa-tag>
					)}
				</Index>
			</div>
		</Show>
	);
};

export default MemberChips;
