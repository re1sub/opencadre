import { Index, Show } from "solid-js";
import UserAvatar from "#/features/ui/UserAvatar";
import type { WorkspaceMember } from "#/features/workspace/types";
import { resolveRefs } from "#/utils/array";
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
							<UserAvatar
								name={member().name}
								avatarUrl={member().avatarUrl}
								color={member().color}
								label={member().name}
								size="25px"
							/>

							{member().name}
						</wa-tag>
					)}
				</Index>
			</div>
		</Show>
	);
};

export default MemberChips;
