import type { RESTPostAPIChannelMessageJSONBody } from "discord-api-types/v10";
import { strictEqual } from "node:assert/strict";
import { suite, test } from "node:test";
import type { PartialPlayer, UserResult } from "../src/BrawlNotifications.ts";
import { agent, brawlNotificationsWorkflow, DB, env } from "./mocks.ts";
import { user } from "./testData.ts";
import { constant, noop } from "./utils.ts";

await suite("Scheduled tests", async () => {
	const { default: server } = await import("../src/index.ts");
	const { NotificationType } = await import("../src/BrawlNotifications.ts");

	await test("Brawl notifications", async (t) => {
		DB.results = [
			{
				id: user().id,
				brawlNotifications: NotificationType.All,
				brawlTag: "#8QJR0YC",
				brawlers: JSON.stringify([
					{ id: 1, rank: 1 },
					{ id: 2, rank: 51 },
					{ id: 3, rank: 3 },
				] satisfies Pick<Brawl.BrawlerStat, "id" | "rank">[]),
				brawlTrophies: 1000,
			},
		] satisfies UserResult[];
		t.afterEach(() => {
			agent.getCallHistory()?.clear();
		});
		agent
			.get("https://discord.com")
			.intercept({ path: /\/channels\/\d+\/messages/, method: "POST" })
			.reply(200);

		await t.test("No notifications", async () => {
			agent
				.get("https://api.brawlstars.com")
				.intercept({ path: constant(true), method: "GET" })
				.reply(200, {
					name: "GX DTrombett",
					brawlers: [],
					highestTrophies: 0,
					nameColor: "0xff008800",
					icon: { id: 0 },
				} satisfies PartialPlayer);
			await server.scheduled!(
				{ cron: "*/5 * * * *", scheduledTime: Date.now(), noRetry: noop },
				env,
				{
					props: null,
					passThroughOnException: noop,
					waitUntil: noop,
					exports: {},
				},
			);
			await brawlNotificationsWorkflow.instances.at(-1)?.promise;
			strictEqual(agent.getCallHistory()?.calls().length, 1);
		});

		await t.test("Too many notifications", async () => {
			agent
				.get("https://api.brawlstars.com")
				.intercept({ path: constant(true), method: "GET" })
				.reply(200, {
					name: "GX DTrombett",
					brawlers: [
						{ id: 1, rank: 10, name: "" },
						{ id: 2, rank: 51, name: "" },
						{ id: 3, rank: 51, name: "" },
						{ id: 4, rank: 51, name: "" },
						{ id: 5, rank: 1, name: "" },
						...Array.from({ length: 16 }, (_, i) => ({
							id: 6 + i,
							rank: 51,
							name: "",
						})),
					],
					highestTrophies: 10000,
					nameColor: "0xff008800",
					icon: { id: 0 },
				} satisfies PartialPlayer);
			await server.scheduled!(
				{ cron: "*/5 * * * *", scheduledTime: Date.now(), noRetry: noop },
				env,
				{
					props: null,
					passThroughOnException: noop,
					waitUntil: noop,
					exports: {},
				},
			);
			await brawlNotificationsWorkflow.instances.at(-1)?.promise;
			const calls = agent.getCallHistory()?.calls();
			strictEqual(calls?.length, 2);
			const body: RESTPostAPIChannelMessageJSONBody = JSON.parse(
				calls[1]!.body!,
			);
			strictEqual(body.components?.length, 12);
		});
	});
});
