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
	type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { once } from "node:events";
import { Temporal } from "temporal-polyfill";
import { rest } from "./util/rest.ts";

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
				const webSocketManager = new WebSocketManager({
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
					.on(WebSocketShardEvents.Dispatch, async (payload) => {
						if (
							(payload.t !== GatewayDispatchEvents.MessageCreate &&
								payload.t !== GatewayDispatchEvents.MessageUpdate) ||
							payload.d.channel_id !== this.env.WORDLE_CHANNEL ||
							payload.d.author.id !== "1211781489931452447"
						)
							return;
						const match = payload.d.content.match(
							/^(.+) (?:is|and .+ are) playing/,
						);

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
							startTimestamp: Date.parse(
								payload.d.edited_timestamp ?? payload.d.timestamp,
							),
						};
						const results = await Promise.allSettled([
							rest.post(Routes.channelMessages(payload.d.channel_id), {
								body: {
									content: `**${match[1]}** ha appena iniziato il Wordle (\`${wordleStatus.startTimestamp}\`)!`,
									allowed_mentions: { parse: [] },
								} satisfies RESTPostAPIChannelMessageJSONBody,
							}),
							this.env.KV.put(
								JSON.stringify(wordleStatus),
								`wordle&${match[1]}`,
							),
						]);
						for (const result of results)
							if (result.status === "rejected") console.error(result.reason);
					})
					.on(WebSocketShardEvents.Error, (error) => console.error(error))
					.on(WebSocketShardEvents.SocketError, (error) =>
						console.error(error),
					);

				try {
					console.log("Connecting websocket");
					await webSocketManager.connect();
					console.log("Manager connected!");
					await once(webSocketManager, WebSocketShardEvents.Closed);
				} finally {
					webSocketManager.destroy();
					console.log("Manager closed");
				}
			},
		);
		await step.do(
			"Remove instance id from KV",
			this.env.KV.delete.bind(this.env.KV, this.INSTANCE_KEY),
		);
	}

	async closeOldWS(value: string) {
		const id = await this.env.KV.get(this.INSTANCE_KEY);

		if (id) {
			const workflowInstance = await this.env.WEBSOCKET.get(id).catch(() => {});

			await workflowInstance?.terminate().catch(() => {});
		}
		return this.env.KV.put(this.INSTANCE_KEY, value);
	}

	getTodayTimestamp() {
		return Temporal.Now.zonedDateTimeISO("Europe/Rome").startOfDay()
			.epochMilliseconds;
	}
}
