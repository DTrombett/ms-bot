import { WebSocketManager, WebSocketShardEvents } from "@discordjs/ws";
import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	GatewayDispatchEvents,
	GatewayIntentBits,
	Routes,
	type RESTPostAPIChannelMessageJSONBody,
	type RESTPostAPIChannelMessageResult,
} from "discord-api-types/v10";
import { once } from "node:events";
import { Temporal } from "temporal-polyfill";
import { rest } from "./util/rest.ts";
import { template } from "./util/strings.ts";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Params = {};

export class WebSocket extends WorkflowEntrypoint<Env, Params> {
	private readonly INSTANCE_KEY = "wsInstance";
	override async run(
		event: Readonly<WorkflowEvent<Params>>,
		step: WorkflowStep,
	) {
		await step.do(
			"Update KV with new instance id",
			this.closeOldWS.bind(this, event.instanceId),
		);
		await step.do<void>(
			"Start websocket",
			{
				retries: { limit: 64, delay: 5_000, backoff: "constant" },
				timeout: "30 minutes",
			},
			async () => {
				let ping: number | undefined, messageId: string;
				await using emitter = new WebSocketManager({
					handshakeTimeout: 5_000,
					helloTimeout: 5_000,
					intents:
						GatewayIntentBits.GuildMessages | GatewayIntentBits.MessageContent,
					largeThreshold: 50,
					readyTimeout: 5_000,
					rest,
					shardCount: 1,
					token: this.env.DISCORD_TOKEN,
				})
					.on(WebSocketShardEvents.SocketError, console.error)
					.on(WebSocketShardEvents.HeartbeatComplete, (stats) =>
						rest.patch(
							Routes.channelMessage(this.env.STATUS_CHANNEL, messageId),
							{
								body: {
									content: template`
										## 🟢 Status: Ready!
										Latency: **${(ping = stats.latency)}ms**
										Last heartbeat: <t:${Math.round(stats.heartbeatAt / 1000)}:T> (<t:${Math.round(stats.heartbeatAt / 1000)}:R>)
									`,
								} satisfies RESTPostAPIChannelMessageJSONBody,
							},
						),
					)
					.on(WebSocketShardEvents.Dispatch, async (payload) => {
						try {
							if (
								(payload.t !== GatewayDispatchEvents.MessageCreate &&
									payload.t !== GatewayDispatchEvents.MessageUpdate) ||
								payload.d.author.id === this.env.DISCORD_APPLICATION_ID
							)
								return;
							const {
								d,
								d: { author },
							} = payload;

							if (
								d.content.startsWith(`<@${this.env.DISCORD_APPLICATION_ID}>`)
							) {
								let [, command] = d.content.trimStart().split(/\s+/g);

								command = command?.toLowerCase();
								if (command === "ping")
									await rest.post(Routes.channelMessages(d.channel_id), {
										body: {
											content: template`
												### 🏓 Pong!
												${ping}WS: \`${ping}ms\`
											`,
											message_reference: {
												message_id: d.id,
												fail_if_not_exists: false,
											},
											allowed_mentions: { parse: [] },
										} satisfies RESTPostAPIChannelMessageJSONBody,
									});
								return;
							}
							if (
								d.channel_id !== this.env.WORDLE_CHANNEL ||
								author.id !== "1211781489931452447"
							)
								return;
							const match = d.content.match(/^(.+) (?:is|and .+ are) playing/);
							if (!match?.[1]) return;
							let wordleStatus = await this.env.KV.get<{
								startTimestamp?: number;
								words?: number /* Infinity for X */;
								endTimestamp?: number;
							}>(`wordle&${match[1]}`, "json");
							if (
								wordleStatus?.startTimestamp &&
								wordleStatus.startTimestamp >= this.getTodayTimestamp()
							)
								return;
							wordleStatus = {
								startTimestamp: Date.parse(d.edited_timestamp ?? d.timestamp),
							};
							const results = await Promise.allSettled([
								rest.post(Routes.channelMessages(d.channel_id), {
									body: {
										content: `**${match[1]}** ha appena iniziato il Wordle (\`${wordleStatus.startTimestamp}\`)!`,
										allowed_mentions: { parse: [] },
									} satisfies RESTPostAPIChannelMessageJSONBody,
								}),
								this.env.KV.put(
									`wordle&${match[1]}`,
									JSON.stringify(wordleStatus),
								),
							]);
							for (const result of results)
								if (result.status === "rejected") console.error(result.reason);
						} catch (err) {
							console.error(err);
						}
					});

				console.log("Connecting to the WebSocket...");
				await emitter.connect();
				step
					.do("Send status message", () =>
						rest
							.post(Routes.channelMessages(this.env.STATUS_CHANNEL), {
								body: {
									content: "## 🟢 Status: Ready!",
								} satisfies RESTPostAPIChannelMessageJSONBody,
							})
							.then(
								(message) => (message as RESTPostAPIChannelMessageResult).id,
							),
					)
					.then((id) => (messageId = id))
					.catch(console.error);
				console.log("Manager connected!");
				const [error] = await once(emitter, WebSocketShardEvents.Error);
				throw error;
			},
		);
		await step.do(
			"Remove instance id from KV",
			this.env.KV.delete.bind(this.env.KV, this.INSTANCE_KEY),
		);
	}

	private async closeOldWS(value: string) {
		const id = await this.env.KV.get(this.INSTANCE_KEY);

		if (id) {
			const workflowInstance = await this.env.WEBSOCKET.get(id).catch(() => {});

			await workflowInstance?.terminate().catch(() => {});
		}
		return this.env.KV.put(this.INSTANCE_KEY, value);
	}

	private getTodayTimestamp() {
		return Temporal.Now.zonedDateTimeISO("Europe/Rome").startOfDay()
			.epochMilliseconds;
	}
}
