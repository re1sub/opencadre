import { createEffect, createSignal } from "solid-js";
import { supabase } from "#/utils/supabase";

export const useLastEdit = (pageId: () => string | null) => {
	const [lastEdit, setLastEdit] = createSignal<{
		userId: string;
		at: string;
	} | null>(null);

	createEffect(() => {
		const id = pageId();
		if (!id) {
			setLastEdit(null);
			return;
		}

		supabase
			.from("activity_logs")
			.select("user_id, created_at")
			.eq("entity_type", "page")
			.eq("entity_id", id)
			.eq("action", "page_edit")
			.order("created_at", { ascending: false })
			.limit(1)
			.maybeSingle()
			.then(({ data }) => {
				if (data?.user_id) {
					setLastEdit({ userId: data.user_id, at: data.created_at });
				} else {
					setLastEdit(null);
				}
			});
	});

	return lastEdit;
};
