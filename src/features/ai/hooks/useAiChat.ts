import {
	fetchServerSentEvents,
	type UIMessage,
	useChat,
} from "@tanstack/ai-solid";
import { createSignal } from "solid-js";
import type { EntityContext } from "#/types/ai";
import { uid } from "#/utils/misc";
import { supabase } from "#/utils/supabase";

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-generate`;

const getSessionToken = async (): Promise<string> => {
	const { data } = await supabase.auth.getSession();
	return data.session?.access_token ?? "";
};

export interface AiChatOptions {
	entity?: EntityContext;
}

export function useAiChat(options: AiChatOptions = {}) {
	const runId = uid();
	const [lastPrompt, setLastPrompt] = createSignal("");

	const chat = useChat({
		connection: fetchServerSentEvents(EDGE_FUNCTION_URL, async () => ({
			headers: {
				Authorization: `Bearer ${await getSessionToken()}`,
				"x-run-id": runId,
			},
		})),
		onFinish: async (message: UIMessage) => {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) return;

			const prompt = lastPrompt();
			const textPart = message.parts.find(
				(p): p is { type: "text"; content: string } =>
					p.type === "text" && typeof p.content === "string",
			);
			const response = textPart?.content ?? "";

			await supabase.from("ai_requests").insert({
				user_id: user.id,
				page_id:
					options.entity?.type === "page"
						? options.entity.id
						: (options.entity?.pageId ?? null),
				card_id: options.entity?.type === "card" ? options.entity.id : null,
				model: "openai/gpt-4o-mini",
				prompt,
				response,
				tokens_used: null,
			});
		},
	});

	const originalSendMessage = chat.sendMessage;
	chat.sendMessage = async (content, sendMessageOptions) => {
		setLastPrompt(typeof content === "string" ? content : "");
		await originalSendMessage(content, sendMessageOptions);
	};

	return chat;
}
