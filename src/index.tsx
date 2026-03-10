import { env } from "cloudflare:workers";
import { renderToReadableStream } from "react-dom/server";
import Index from "../dist/index";
import * as commands from "./commands/index";
import { CommandHandler } from "./util/CommandHandler";
import { createSolidPng } from "./util/createSolidPng";
import type { RGB } from "./util/resolveColor";

const handler = new CommandHandler(Object.values(commands));
const create405 = (allow = "GET") =>
	new Response(null, { status: 405, headers: { allow } });

const server: ExportedHandler<Env> = {
	fetch: async (request) => {
		const url = new URL(request.url);

		if (url.pathname === "/") {
			if (request.method === "GET")
				return new Response(await renderToReadableStream(<Index />), {
					headers: { "content-type": "text/html" },
				});
			return create405();
		}
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
			const instances = await env.NOTIFICATIONS.createBatch(
				results
					.reduce<Database.SupercellPlayer[][]>((arr, v) => {
						if (!arr.length || arr.at(-1)!.length >= 25) arr.push([]);
						arr.at(-1)!.push(v);
						return arr;
					}, [])
					.map((players) => ({ params: { players } })),
			);

			console.log(
				"Started workflow(s) with IDs",
				...instances.map((r) => r.id),
			);
		}
	},
};

export { Notifications } from "./Notifications";
export { PredictionsReminders } from "./PredictionsReminders";
export { Reminder } from "./Reminder";
export { Shorten } from "./Shorten";
export { WebSocket } from "./WebSocket";

export default server;
