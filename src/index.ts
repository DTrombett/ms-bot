/* eslint-disable no-sparse-arrays */
import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import {
	APIApplicationCommandAutocompleteInteraction,
	APIApplicationCommandInteraction,
	APIMessageComponentInteraction,
	APIModalSubmitInteraction,
	APIPingInteraction,
	ButtonStyle,
	InteractionResponseType,
	RESTPostAPICurrentUserCreateDMChannelJSONBody,
	RESTPostAPICurrentUserCreateDMChannelResult,
	Routes,
} from "discord-api-types/v10";
import * as commandsObject from "./commands";
import type {
	CommandOptions,
	Env,
	Handler,
	MatchDayResponse,
	User,
} from "./util";
import {
	executeInteraction,
	JsonResponse,
	loadMatches,
	rest,
	updateLiveMatchDays,
	verifyDiscordRequest,
} from "./util";

const commands: Record<string, CommandOptions<any>> = commandsObject;
const applicationCommands = Object.fromEntries(
	Object.values(commands).flatMap((cmd) => cmd.data.map((d) => [d.name, cmd])),
);
const handlers: [
	undefined,
	Handler<APIPingInteraction>,
	Handler<APIApplicationCommandInteraction>,
	Handler<APIMessageComponentInteraction>,
	Handler<APIApplicationCommandAutocompleteInteraction>,
	Handler<APIModalSubmitInteraction>,
] = [
	,
	() => ({
		type: InteractionResponseType.Pong,
	}),
	({ interaction, env, context }) =>
		executeInteraction(
			interaction,
			env,
			context,
			"run",
			applicationCommands[interaction.data.name],
		),
	({ interaction, env, context }) =>
		executeInteraction(
			interaction,
			env,
			context,
			"component",
			commands[interaction.data.custom_id.split("-")[0]!],
		),
	({ interaction, env, context }) =>
		executeInteraction(
			interaction,
			env,
			context,
			"autocomplete",
			commands[interaction.data.name],
		),
	({ interaction, env, context }) =>
		executeInteraction(
			interaction,
			env,
			context,
			"modalSubmit",
			commands[interaction.data.custom_id.split("-")[0]!],
		),
];

const server: ExportedHandler<Env> = {
	fetch: async (request, env, context) => {
		const url = new URL(request.url);

		if (url.pathname === "/") {
			if (request.method === "POST") {
				rest.setToken(env.DISCORD_TOKEN);
				const interaction = await verifyDiscordRequest(request, env);

				if (interaction instanceof Response) return interaction;
				const result = await handlers[interaction.type]({
					interaction: interaction as never,
					context,
					env,
				});

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
	scheduled: async ({}, env, ctx) => {
		const matchDays = await fetch(
			`https://legaseriea.it/api/season/${env.SEASON_ID}/championship/A/matchday`,
		)
			.then<MatchDayResponse>((res) => res.json())
			.catch(console.error);

		if (!matchDays) return;
		if (!matchDays.success) {
			console.error("Couldn't load season data", matchDays);
			return;
		}
		rest.setToken(env.DISCORD_TOKEN);
		ctx.waitUntil(
			updateLiveMatchDays(
				matchDays.data.filter((d) => d.category_status === "LIVE"),
				env,
			),
		);
		const matchDayData = matchDays.data.find(
			(d) => d.category_status === "TO BE PLAYED",
		);

		if (!matchDayData) return;
		const [match] = await loadMatches(matchDayData.id_category, 1).catch(
			(err) => {
				console.error(err);
				return [];
			},
		);

		if (!match) return;
		const startTime = Date.parse(match.date_time) - 900000;
		const minutes = (startTime - Date.now()) / 60_000;

		if (minutes <= 0) return;
		const { results } = await env.DB.prepare(
			`SELECT u.id
			FROM Users u
			WHERE u.reminded = 0
			AND u.remindMinutes >= ?1`,
		)
			.bind(Math.floor(minutes))
			.all<Pick<User, "id">>();

		if (!results.length) return;
		await Promise.all([
			...results.map(async ({ id: recipient_id }) => {
				const { id } = (await rest.post(Routes.userChannels(), {
					body: {
						recipient_id,
					} satisfies RESTPostAPICurrentUserCreateDMChannelJSONBody,
				})) as RESTPostAPICurrentUserCreateDMChannelResult;

				await rest.post(Routes.channelMessages(id), {
					body: {
						content:
							"⚽ È l'ora di inviare i pronostici per la prossima giornata!",
						components: [
							new ActionRowBuilder<ButtonBuilder>()
								.addComponents(
									new ButtonBuilder()
										.setCustomId(
											`predictions-${Number(matchDayData.description)}-1-${startTime}`,
										)
										.setEmoji({ name: "⚽" })
										.setLabel("Invia pronostici")
										.setStyle(ButtonStyle.Primary),
								)
								.toJSON(),
						],
					},
				});
			}),
			env.DB.prepare(
				`UPDATE Users SET reminded = 1 WHERE id IN (${Array(results.length).fill("?").join(", ")})`,
			)
				.bind(...results.map(({ id }) => id))
				.run(),
		]);
	},
};

export default server;
