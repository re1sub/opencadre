import { withSupabase } from "npm:@supabase/server";
import {
	chat,
	chatParamsFromRequest,
	toServerSentEventsResponse,
} from "npm:@tanstack/ai";
import { createOpenRouterText } from "npm:@tanstack/ai-openrouter";

const SYSTEM_PROMPT = `You are a writing assistant for OpenCadre. 
Your sole purpose is to output the requested text content.

CRITICAL INSTRUCTIONS:
- You must output ONLY the requested text content in clean Markdown.
- ABSOLUTELY NO greetings (e.g., "Sure", "Certainly", "Here is").
- ABSOLUTELY NO conversational fillers, meta-commentary, or closing remarks.
- Begin the response directly with the requested content.
- Do not provide explanations unless explicitly asked.`;

const MODEL = "openai/gpt-4o-mini";

export default {
	fetch: withSupabase({ auth: "user" }, async (req, _ctx) => {
		const apiKey = Deno.env.get("OPENROUTER_API_KEY");
		if (!apiKey) {
			return Response.json(
				{ error: "Missing OpenRouter API key" },
				{ status: 500 },
			);
		}

		const params = await chatParamsFromRequest(req);

		const stream = chat({
			adapter: createOpenRouterText(MODEL, apiKey, {
				appTitle: "OpenCadre",
			}),
			messages: [
				{
					id: crypto.randomUUID(),
					role: "system",
					parts: [{ type: "text", content: SYSTEM_PROMPT }],
				},
				...params.messages,
			],
			modelOptions: { maxCompletionTokens: 2000 },
		});

		const res = toServerSentEventsResponse(stream);
		return new Response(res.body, {
			status: res.status,
			statusText: res.statusText,
			headers: res.headers,
		});
	}),
};
