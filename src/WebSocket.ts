import {
	CompressionMethod,
	WebSocketManager,
	WebSocketShardEvents,
	type SessionInfo,
} from "@discordjs/ws";
import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	GatewayDispatchEvents,
	GatewayIntentBits,
	Routes,
	type GatewayDispatchPayload,
	type RESTPostAPIChannelMessageJSONBody,
	type RESTPostAPIChannelMessageResult,
} from "discord-api-types/v10";
import { on } from "node:events";
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
		await step.do(
			"Start websocket",
			{
				retries: { limit: 15, delay: 5_000, backoff: "linear" },
				timeout: "1 day",
			},
			async () => {
				await using emitter = new WebSocketManager({
					compression: CompressionMethod.ZlibNative,
					handshakeTimeout: 5_000,
					helloTimeout: 5_000,
					intents:
						GatewayIntentBits.GuildMessages | GatewayIntentBits.MessageContent,
					largeThreshold: 50,
					readyTimeout: 5_000,
					rest,
					shardCount: 1,
					token: this.env.DISCORD_TOKEN,
					updateSessionInfo: (shardId, sessionInfo) =>
						sessionInfo ?
							this.env.KV.put(`session&${shardId}`, JSON.stringify(sessionInfo))
						:	this.env.KV.delete(`session&${shardId}`),
					retrieveSessionInfo: (shardId) =>
						this.env.KV.get<SessionInfo>(`session&${shardId}`, "json"),
				})
					.on(WebSocketShardEvents.Error, console.error)
					.on(WebSocketShardEvents.SocketError, console.error);
				console.log("Connecting to the WebSocket...");
				await emitter.connect();
				console.log("Manager connected!");
				const id = await step.do("Send status message", () =>
					rest
						.post(Routes.channelMessages(this.env.STATUS_CHANNEL), {
							body: {
								content: "## 🟢 Status: Ready!",
							} satisfies RESTPostAPIChannelMessageJSONBody,
						})
						.then((message) => (message as RESTPostAPIChannelMessageResult).id),
				);
				let ping: number | undefined;

				emitter.on(WebSocketShardEvents.HeartbeatComplete, (stats) => {
					ping = stats.latency;
					return rest.patch(
						Routes.channelMessage(this.env.STATUS_CHANNEL, id),
						{
							body: {
								content: template`
									## 🟢 Status: Ready!
									Latency: **${stats.latency}ms**
									Last heartbeat: <t:${Math.round(stats.heartbeatAt / 1_000)}:T> (<t:${Math.round(stats.heartbeatAt / 1_000)}:R>)
								`,
							} satisfies RESTPostAPIChannelMessageJSONBody,
						},
					);
				});
				for await (const [payload] of on(
					emitter,
					WebSocketShardEvents.Dispatch,
					{ close: [WebSocketShardEvents.Closed] },
				) as NodeJS.AsyncIterator<[payload: GatewayDispatchPayload]>)
					try {
						if (
							(payload.t !== GatewayDispatchEvents.MessageCreate &&
								payload.t !== GatewayDispatchEvents.MessageUpdate) ||
							payload.d.author.id === this.env.DISCORD_APPLICATION_ID
						)
							continue;
						const {
							d,
							d: { author },
						} = payload;

						if (d.content.startsWith(`<@${this.env.DISCORD_APPLICATION_ID}>`)) {
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
							continue;
						}
						if (
							d.channel_id !== this.env.WORDLE_CHANNEL ||
							author.id !== "1211781489931452447"
						)
							continue;
						const match = d.content.match(/^(.+) (?:is|and .+ are) playing/);
						if (!match?.[1]) continue;
						let wordleStatus = await this.env.KV.get<{
							startTimestamp?: number;
							words?: number /* Infinity for X */;
							endTimestamp?: number;
						}>(`wordle&${match[1]}`, "json");
						if (
							wordleStatus?.startTimestamp &&
							wordleStatus.startTimestamp >= this.getTodayTimestamp()
						)
							continue;
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
