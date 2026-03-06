import { env } from "cloudflare:workers";
import type { Params as BrawlParams } from "./BrawlNotifications";
import type { Params as ClashParams } from "./ClashNotifications";
import * as commands from "./commands/index";
import { CommandHandler } from "./util/CommandHandler";
import { SupercellPlayerType } from "./util/Constants";
import { createSolidPng } from "./util/createSolidPng";
import type { RGB } from "./util/resolveColor";

const handler = new CommandHandler(Object.values(commands));
const create405 = (allow = "GET") =>
	new Response(null, { status: 405, headers: { allow } });

const server: ExportedHandler<Env> = {
	fetch: async (request) => {
		const url = new URL(request.url);

		if (url.pathname === "/interactions") {
			if (request.method === "POST")
				return handler.handleInteraction(request).catch((e) => {
					if (e instanceof Response) return e;
					console.error(e);
					return new Response(null, { status: 500 });
				});
			return create405("POST");
		}
		if (url.pathname === "/color") {
			if (request.method !== "GET") return create405();
			const rgb = [
				url.searchParams.get("red"),
				url.searchParams.get("green"),
				url.searchParams.get("blue"),
			].map(Number) as RGB;

			if (rgb.some(isNaN))
				return Response.json(
					{ error: "Missing 'red', 'green' or 'blue' query parameter" },
					{ status: 400 },
				);
			return new Response(await createSolidPng(256, 256, ...rgb), {
				headers: { "Content-Type": "image/png" },
			});
		}
		if (url.pathname === "/") {
			if (request.method === "GET") return new Response("Ready!");
			return create405();
		}
		return new Response(null, { status: 404 });
	},
	scheduled: async ({ cron }) => {
		if (cron === "0 0 * * *")
			await Promise.allSettled([
				env.PREDICTIONS_REMINDERS.create(),
				env.WEBSOCKET.create(),
			]);
		else if (cron === "*/5 * * * *") {
			const { results } = await env.DB.prepare(
				`SELECT *
				FROM SupercellPlayers
				WHERE notifications != 0`,
			).all<Database.SupercellPlayer>();
			const brawlBatch: WorkflowInstanceCreateOptions<BrawlParams>[] = results
				.reduce<Database.SupercellPlayer[][]>((arr, v) => {
					if (v.type !== SupercellPlayerType.BrawlStars) return arr;
					if (!arr.length || arr.at(-1)!.length >= 25) arr.push([]);
					arr.at(-1)!.push(v);
					return arr;
				}, [])
				.map((players) => ({ params: { players } }));
			const clashBatch: WorkflowInstanceCreateOptions<ClashParams>[] = results
				.reduce<Database.SupercellPlayer[][]>((arr, v) => {
					if (v.type !== SupercellPlayerType.ClashRoyale) return arr;
					if (!arr.length || arr.at(-1)!.length >= 25) arr.push([]);
					arr.at(-1)!.push(v);
					return arr;
				}, [])
				.map((players) => ({ params: { players } }));

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

export { BrawlNotifications } from "./BrawlNotifications";
export { ClashNotifications } from "./ClashNotifications";
export { PredictionsReminders } from "./PredictionsReminders";
export { Reminder } from "./Reminder";
export { Shorten } from "./Shorten";
export { WebSocket } from "./WebSocket";

export default server;
