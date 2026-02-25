import { env } from "cloudflare:workers";
import type {
	Params as BrawlParams,
	UserResult as BrawlUserResult,
} from "./BrawlNotifications.ts";
import type {
	Params as ClashParams,
	UserResult as ClashUserResult,
} from "./ClashNotifications.ts";
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
	scheduled: async ({ cron }) => {
		if (cron === "0 0 * * *")
			await Promise.allSettled([
				env.PREDICTIONS_REMINDERS.create(),
				env.WEBSOCKET.create(),
			]);
		else if (cron === "*/5 * * * *") {
			const { results } = await env.DB.prepare(
				`SELECT id,
					brawlTag,
					brawlNotifications,
					brawlTrophies,
					brawlers,
					clashTag,
					clashNotifications,
					cards,
					arena,
					league
				FROM Users
				WHERE (
						brawlTag IS NOT NULL
						AND brawlNotifications != 0
					)
					OR (
						clashTag IS NOT NULL
						AND clashNotifications != 0
					)`,
			).all<BrawlUserResult & ClashUserResult>();
			const brawlBatch: WorkflowInstanceCreateOptions<BrawlParams>[] = results
				.reduce((arr, v) => {
					if (!v.brawlTag || !v.brawlNotifications) return arr;
					if (!arr.length || arr.at(-1)!.length >= 25) arr.push([]);
					arr
						.at(-1)!
						.push({
							brawlNotifications: v.brawlNotifications,
							brawlTag: v.brawlTag,
							brawlTrophies: v.brawlTrophies,
							id: v.id,
							brawlers: v.brawlers,
						});
					return arr;
				}, [] as BrawlUserResult[][])
				.map((users) => ({ params: { users } }));
			const clashBatch: WorkflowInstanceCreateOptions<ClashParams>[] = results
				.reduce((arr, v) => {
					if (!v.clashTag || !v.clashNotifications) return arr;
					if (!arr.length || arr.at(-1)!.length >= 16) arr.push([]);
					arr
						.at(-1)!
						.push({
							clashNotifications: v.clashNotifications,
							clashTag: v.clashTag,
							arena: v.arena,
							cards: v.cards,
							id: v.id,
							league: v.league,
						});
					return arr;
				}, [] as ClashUserResult[][])
				.map((users) => ({ params: { users } }));

			for (const result of await Promise.allSettled([
				brawlBatch.length ?
					env.BRAWL_NOTIFICATIONS.createBatch(brawlBatch)
				:	null,
				clashBatch.length ?
					env.CLASH_NOTIFICATIONS.createBatch(clashBatch)
				:	null,
			]))
				if (result.status === "rejected") console.error(result.reason);
				else
					console.log(
						"Started workflow(s) with IDs",
						...(result.value ?? []).map((r) => r.id),
					);
		}
	},
};

export { BrawlNotifications } from "./BrawlNotifications.ts";
export { ClashNotifications } from "./ClashNotifications.ts";
export { PredictionsReminders } from "./PredictionsReminders.ts";
export { Reminder } from "./Reminder.ts";
export { Shorten } from "./Shorten.ts";
export { WebSocket } from "./WebSocket.ts";

export default server;
