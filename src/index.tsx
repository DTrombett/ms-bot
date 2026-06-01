import pages from "build:routes";
import { env } from "cloudflare:workers";
import { createPage } from "./util/createPage";
import { findRoute } from "./util/findRoute";
import { queueHandlers } from "./util/queueHandlers";

const server: ExportedHandler<Env, QueueMessage> = {
	fetch: async (request) => {
		const response: ResponseInit & { headers: Headers } = {
			headers: new Headers({ "accept-ch": "Sec-CH-UA-Mobile" }),
		};
		const url = new URL(request.url);
		let router = findRoute(url);

		if (!router) {
			response.status = 404;
			router = { route: pages["404"].index, params: [] };
		}
		return createPage(router, request, response, url);
	},
	scheduled: async ({ cron }) => {
		if (cron === "0 0 * * *")
			await Promise.allSettled([env.PREDICTIONS_REMINDERS.create()]);
		else if (cron === "*/5 * * * *") {
			const { results } = await env.DB.prepare(
				`SELECT * FROM SupercellPlayers WHERE notifications > 0`,
			).run<Database.SupercellPlayer>();
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
	queue: async (batch) => {
		await Promise.all(
			batch.messages.map(async (m) => {
				try {
					await queueHandlers[m.body.t](m as never, batch);
					m.ack();
				} catch (err) {
					m.retry();
					console.error(err);
				}
			}),
		);
	},
};

export { Channels } from "./Channels";
export { DeleteChannels } from "./DeleteChannels";
export { Notifications } from "./Notifications";
export { PredictionsReminders } from "./PredictionsReminders";
export { Reminder } from "./Reminder";
export { Shorten } from "./Shorten";
export { Tournament } from "./Tournament";

export default server;
