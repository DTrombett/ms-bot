import {
	CompressionMethod,
	WebSocketManager,
	WebSocketShardEvents,
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
	override async run(
		_event: Readonly<WorkflowEvent<Params>>,
		step: WorkflowStep,
	) {
		await step.do(
			"start websocket",
			{
				retries: { limit: 3, delay: 5_000, backoff: "exponential" },
				timeout: "1 day",
			},
			async () => {
				const ws = new WebSocketManager({
					compression: CompressionMethod.ZlibNative,
					handshakeTimeout: 5000,
					helloTimeout: 5000,
					intents:
						GatewayIntentBits.GuildMessages | GatewayIntentBits.MessageContent,
					largeThreshold: 50,
					readyTimeout: 5000,
					rest,
					token: this.env.DISCORD_TOKEN,
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
						await Promise.allSettled([
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
					})
					.on(WebSocketShardEvents.Debug, (message) => console.debug(message))
					.on(WebSocketShardEvents.Error, (error) => console.error(error))
					.on(WebSocketShardEvents.SocketError, (error) =>
						console.error(error),
					);

				try {
					console.log("Connecting websocket");
					await ws.connect();
					console.log("Manager connected!");
					await once(ws, WebSocketShardEvents.Closed);
					console.log("Manager closed");
				} finally {
					ws.destroy();
				}
			},
		);
	}

	getTodayTimestamp() {
		return Temporal.Now.zonedDateTimeISO("Europe/Rome").startOfDay()
			.epochMilliseconds;
	}
}
