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

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type, x-run-id",
};

const corsResponse = (body: string, status: number): Response => {
	return new Response(body, { status, headers: corsHeaders });
};

Deno.serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	const authHeader = req.headers.get("Authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		return corsResponse("Unauthorized", 401);
	}

	const apiKey = Deno.env.get("OPENROUTER_API_KEY");
	if (!apiKey) {
		return corsResponse("Missing OpenRouter API key", 500);
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
		headers: new Headers([...res.headers, ...Object.entries(corsHeaders)]),
	});
});
