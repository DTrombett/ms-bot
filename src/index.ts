import {
	InteractionResponseType,
	InteractionType,
	Routes,
	type RESTPatchAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import * as commandsObject from "./commands";
import type { Env, MatchData } from "./util";
import {
	Command,
	JsonResponse,
	closeMatchDay,
	errorToResponse,
	getLiveEmbeds,
	getPredictionsData,
	handleLiveData,
	info,
	loadMatches,
	resolveLeaderboard,
	rest,
	verifyDiscordRequest,
} from "./util";

const commands: Record<string, Command> = commandsObject;
const applicationCommands = new Map(
	Object.values(commands).flatMap((cmd) => cmd.data.map((d) => [d.name, cmd])),
);

const server: ExportedHandler<Env> = {
	fetch: async (request, env, context) => {
		const url = new URL(request.url);

		rest.setToken(env.DISCORD_TOKEN);
		if (url.pathname === "/") {
			if (request.method === "POST") {
				const interaction = await verifyDiscordRequest(request, env).catch(
					errorToResponse,
				);

				if (interaction instanceof Response) return interaction;
				let action: string | undefined, result;

				switch (interaction.type) {
					case InteractionType.Ping:
						result = {
							type: InteractionResponseType.Pong,
						};
						info("Received ping interaction!");
						break;
					case InteractionType.ApplicationCommand:
						result = await applicationCommands
							.get(interaction.data.name)
							?.run(interaction, env, context);
						info(
							`Command ${interaction.data.name} executed by ${
								(interaction.member ?? interaction).user?.username
							} in ${interaction.channel.name} (${
								interaction.channel.id
							}) - guild ${interaction.guild_id}`,
						);
						break;
					case InteractionType.MessageComponent:
						[action] = interaction.data.custom_id.split("-");
						if (!action) break;
						result = await commands[action]?.component(
							interaction,
							env,
							context,
						);
						info(
							`Component interaction ${action} executed by ${
								(interaction.member ?? interaction).user?.username
							} in ${interaction.channel.name} (${
								interaction.channel.id
							}) - guild ${interaction.guild_id}`,
						);
						break;
					case InteractionType.ApplicationCommandAutocomplete:
						result = await commands[interaction.data.name]?.autocomplete(
							interaction,
							env,
							context,
						);
						break;
					case InteractionType.ModalSubmit:
						[action] = interaction.data.custom_id.split("-");
						if (!action) break;
						result = await commands[action]?.modalSubmit(
							interaction,
							env,
							context,
						);
						info(
							`Modal interaction ${action} executed by ${
								(interaction.member ?? interaction).user?.username
							} in ${interaction.channel?.name} (${
								interaction.channel?.id
							}) - guild ${interaction.guild_id}`,
						);
						break;
					default:
						break;
				}
				return result
					? new JsonResponse(result)
					: new JsonResponse(
							{ error: "Internal Server Error" },
							{ status: 500 },
						);
			}
			if (request.method === "GET") return new Response("Ready!");
			return new JsonResponse({ error: "Method Not Allowed" }, { status: 405 });
		}
		return new JsonResponse({ error: "Not Found" }, { status: 404 });
	},
	scheduled: async (controller, env) => {
		rest.setToken(env.DISCORD_TOKEN);
		const current = await env.KV.getWithMetadata("currentMatchDay");

		if (!current.value) {
			console.log("Nessuna giornata in corso!");
			return;
		}
		if (controller.scheduledTime < Number(current.metadata ?? 0)) {
			console.log("Skipped!");
			return;
		}
		const [matchDayId, messageId] = current.value.split("-");

		if (!messageId || messageId.length < 18) {
			console.log("Wrong message id encountered!");
			return;
		}
		const matches = await loadMatches(matchDayId);
		const liveMatches = matches.filter((m) => m.status === "LIVE");
		let nextTimestamp: number | undefined;

		if (!liveMatches.length) {
			const nextMatch = matches.find((m) => m.status === "UPCOMING");
			const next = nextMatch?.kickOffTime.dateTime;

			if (next) nextTimestamp = Date.parse(next);
			liveMatches.push(
				!nextTimestamp || nextTimestamp > Date.now()
					? matches.findLast((m) => m.status === "FINISHED")!
					: nextMatch!,
			);
		}
		const [users] = await Promise.all([
			getPredictionsData(env, matches),
			nextTimestamp &&
				nextTimestamp > controller.scheduledTime &&
				env.KV.put("currentMatchDay", `${matchDayId}-${messageId}`, {
					metadata: nextTimestamp,
				}),
			...liveMatches
				.filter((m) => m as MatchData | null)
				.map((m) =>
					fetch(`https://uefa.com/euro2024/match/${m.id}`)
						.then((res) => res.text())
						.then(handleLiveData(env, m, controller.scheduledTime)),
				),
		]);
		const leaderboard = resolveLeaderboard(users, matches);
		const finished = matches.every((match) => match.status === "FINISHED");

		await Promise.all([
			rest.patch(Routes.channelMessage(env.PREDICTIONS_CHANNEL, messageId), {
				body: {
					embeds: getLiveEmbeds(
						users,
						matches,
						leaderboard,
						`${matches[0]!.round.metaData.type === "GROUP_STANDINGS" ? `Group stage - ${matches[0]!.matchday.longName}` : matches[0]!.round.metaData.name}`,
						finished,
					),
				} satisfies RESTPatchAPIChannelMessageJSONBody,
			}),
			finished && closeMatchDay(env, leaderboard, matches),
		]);
	},
};

export default server;
