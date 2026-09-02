import { fetchServerSentEvents, useChat } from "@tanstack/ai-solid";
import { supabase } from "#/utils/supabase";

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-generate`;

const getSessionToken = async (): Promise<string> => {
	const { data } = await supabase.auth.getSession();
	return data.session?.access_token ?? "";
};

export function useAiChat() {
	return useChat({
		connection: fetchServerSentEvents(EDGE_FUNCTION_URL, async () => ({
			headers: {
				Authorization: `Bearer ${await getSessionToken()}`,
			},
		})),
	});
}
