import {
	fetchServerSentEvents,
	type UIMessage,
	useChat,
} from "@tanstack/ai-solid";
import type { EntityContext } from "#/types/ai";
import { featureFlags } from "#/utils/featureFlags";
import { supabase } from "#/utils/supabase";

const EDGE_FUNCTION_URL = `${import.meta.env.SUPABASE_PUBLIC_URL}/functions/v1/ai-generate`;

const getSessionToken = async (): Promise<string> => {
	const { data } = await supabase.auth.getSession();
	return data.session?.access_token ?? "";
};

export interface AiChatOptions {
	entity?: EntityContext;
}

export function useAiChat(options: AiChatOptions = {}) {
	const chat = useChat({
		connection: fetchServerSentEvents(EDGE_FUNCTION_URL, async () => {
			if (!featureFlags.ai) {
				throw new Error("AI is disabled.");
			}
			return {
				headers: {
					Authorization: `Bearer ${await getSessionToken()}`,
				},
			};
		}),
		onFinish: async (message: UIMessage) => {
			if (!featureFlags.ai) return;

			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) return;
			void message;

			const { error } = await supabase.from("ai_requests").insert({
				user_id: user.id,
				page_id:
					options.entity?.type === "page"
						? options.entity.id
						: (options.entity?.pageId ?? null),
				card_id: options.entity?.type === "card" ? options.entity.id : null,
				model: "openai/gpt-4o-mini",
				tokens_used: null,
			});
			if (error) console.error("Failed to record the AI request", error);
		},
	});

	return chat;
}
