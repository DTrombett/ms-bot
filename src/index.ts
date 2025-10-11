import * as commands from "./commands";
import type { RGB } from "./util";
import { CommandHandler, createSolidPng, JsonResponse, rest } from "./util";

const handler = new CommandHandler(Object.values(commands));

const server: ExportedHandler<Env> = {
	fetch: async (request, env, context) => {
		const url = new URL(request.url);

		if (url.pathname === "/") {
			if (request.method === "POST") {
				rest.setToken(env.DISCORD_TOKEN);
				return handler.handleInteraction(request, context).catch((e) => {
					if (e instanceof Response) return e;
					console.error(e);
					return new Response(null, { status: 500 });
				});
			}
			if (request.method === "GET") return new Response("Ready!");
			return new JsonResponse({ error: "Method Not Allowed" }, { status: 405 });
		}
		if (url.pathname === "/color") {
			if (request.method !== "GET")
				return new JsonResponse(
					{ error: "Method Not Allowed" },
					{ status: 405 },
				);
			const rgb = [
				url.searchParams.get("red"),
				url.searchParams.get("green"),
				url.searchParams.get("blue"),
			].map(Number) as RGB;
			if (rgb.some(isNaN))
				return new JsonResponse(
					{ error: "Missing 'red', 'green' or 'blue' query parameter" },
					{ status: 400 },
				);
			return new Response(await createSolidPng(256, 256, ...rgb), {
				headers: { "Content-Type": "image/png" },
			});
		}
		return new JsonResponse({ error: "Not Found" }, { status: 404 });
	},
	scheduled: async ({}, env) => {
		await env.PREDICTIONS_REMINDERS.create();
	},
};

// export { LiveMatch } from "./LiveMatch";
export { LiveScore } from "./LiveScore";
export { PredictionsReminders } from "./PredictionsReminders";
export { Reminder } from "./Reminder";
export { Shorten } from "./Shorten";

export default server;
