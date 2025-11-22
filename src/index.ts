import { env } from "cloudflare:workers";
import type { UserResult } from "./BrawlNotifications.ts";
import * as commands from "./commands/index.ts";
import { CommandHandler } from "./util/CommandHandler.ts";
import { createSolidPng } from "./util/createSolidPng.ts";
import { JsonResponse } from "./util/JsonResponse.ts";
import type { RGB } from "./util/resolveColor.ts";

const handler = new CommandHandler(Object.values(commands));

const server: ExportedHandler<Env> = {
	fetch: async (request) => {
		const url = new URL(request.url);

		if (url.pathname === "/") {
			if (request.method === "POST")
				return handler.handleInteraction(request).catch((e) => {
					if (e instanceof Response) return e;
					console.error(e);
					return new Response(null, { status: 500 });
				});
			if (request.method === "GET") return new Response("Ready!");
			return new JsonResponse({ error: "Method Not Allowed" }, { status: 405 });
		}
		if (url.pathname === "/color") {
			if (request.method !== "GET")
				return new JsonResponse(
					{ error: "Method Not Allowed" },
					{ status: 405 }
				);
			const rgb = [
				url.searchParams.get("red"),
				url.searchParams.get("green"),
				url.searchParams.get("blue"),
			].map(Number) as RGB;
			if (rgb.some(isNaN))
				return new JsonResponse(
					{ error: "Missing 'red', 'green' or 'blue' query parameter" },
					{ status: 400 }
				);
			return new Response(await createSolidPng(256, 256, ...rgb), {
				headers: { "Content-Type": "image/png" },
			});
		}
		return new JsonResponse({ error: "Not Found" }, { status: 404 });
	},
	scheduled: async ({ cron }) => {
		if (cron === "0 0 * * *") await env.PREDICTIONS_REMINDERS.create();
		else if (cron === "*/5 * * * *") {
			const { results } = await env.DB.prepare(
				`SELECT id,
					brawlTag,
					brawlNotifications,
					brawlTrophies,
					brawlers
				FROM Users
				WHERE brawlTag IS NOT NULL
					AND brawlNotifications != 0`
			).all<UserResult>();
			const usersChunks = results.reduce((arr, v, i) => {
				if (i % 16 === 0) arr.push([]);
				arr.at(-1)!.push(v);
				return arr;
			}, [] as UserResult[][]);

			await env.BRAWL_NOTIFICATIONS.createBatch(
				usersChunks.map((users) => ({ params: { users } }))
			);
		}
	},
};

export { BrawlNotifications } from "./BrawlNotifications.ts";
export { LiveScore } from "./LiveScore.ts";
export { PredictionsReminders } from "./PredictionsReminders.ts";
export { Reminder } from "./Reminder.ts";
export { Shorten } from "./Shorten.ts";

export default server;
