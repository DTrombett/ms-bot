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
} from "discord-api-types/v10";
import { on } from "node:events";
import { Temporal } from "temporal-polyfill";
import { rest } from "./util/rest.ts";
import { template } from "./util/strings.ts";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Params = {};
type CustomWSManager = WebSocketManager & {
	ping?: number;
};

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
				const emitter: CustomWSManager = new WebSocketManager({
					compression: CompressionMethod.ZlibNative,
					handshakeTimeout: 5000,
					helloTimeout: 5000,
					intents:
						GatewayIntentBits.GuildMessages | GatewayIntentBits.MessageContent,
					largeThreshold: 50,
					readyTimeout: 5000,
					rest,
					shardCount: 1,
					token: this.env.DISCORD_TOKEN,
					updateSessionInfo: (shardId, sessionInfo) =>
						sessionInfo
							? this.env.KV.put(
									`session&${shardId}`,
									JSON.stringify(sessionInfo),
							  )
							: this.env.KV.delete(`session&${shardId}`),
					retrieveSessionInfo: (shardId) =>
						this.env.KV.get<SessionInfo>(`session&${shardId}`, "json"),
				})
					.on(WebSocketShardEvents.Error, (error) => console.error(error))
					.on(WebSocketShardEvents.SocketError, (error) => console.error(error))
					.on(
						WebSocketShardEvents.HeartbeatComplete,
						({ latency }) => (emitter.ping = latency),
					);

				try {
					console.log("Connecting websocket");
					await emitter.connect();
					console.log("Manager connected!");
					await rest.post(Routes.channelMessages(this.env.STATUS_CHANNEL), {
						body: {
							content: "Ready!",
						} satisfies RESTPostAPIChannelMessageJSONBody,
					});
					for await (const [payload] of on(
						emitter,
						WebSocketShardEvents.Dispatch,
						{ close: [WebSocketShardEvents.Closed] },
					) as NodeJS.AsyncIterator<[payload: GatewayDispatchPayload]>) {
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
										${emitter.ping}WS: \`${emitter.ping}ms\`
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
					}
				} finally {
					emitter.destroy();
					console.log("Manager closed");
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
