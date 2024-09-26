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
import type { Env, Handler, MatchDay, User } from "./util";
import { Command, JsonResponse, rest, verifyDiscordRequest } from "./util";

const commands: Record<string, Command> = commandsObject;
const applicationCommands = new Map(
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
		applicationCommands
			.get(interaction.data.name)
			?.run(interaction, env, context),
	({ interaction, env, context }) =>
		commands[interaction.data.custom_id.split("-")[0]!]?.component(
			interaction,
			env,
			context,
		),
	({ interaction, env, context }) =>
		commands[interaction.data.name]?.autocomplete(interaction, env, context),
	({ interaction, env, context }) =>
		commands[interaction.data.custom_id.split("-")[0]!]?.modalSubmit(
			interaction,
			env,
			context,
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
	scheduled: async ({}, env) => {
		const { results } = await env.DB.prepare(
			`SELECT u.id, m.day, m.startDate
			FROM Users u
			JOIN MatchDays m ON 1 = 1
			WHERE u.reminded = 0
			AND u.remindMinutes >= (strftime('%s', m.startDate) - strftime('%s', 'now', '+15 minutes')) / 60
			  AND m.startDate > datetime('now', '+15 minutes')
			  AND m.day = (SELECT MAX(day) FROM MatchDays);`,
		).all<Pick<MatchDay, "day" | "startDate"> & Pick<User, "id">>();

		if (!results.length) return;
		rest.setToken(env.DISCORD_TOKEN);
		await Promise.all([
			...results.map(async ({ id: recipient_id, day, startDate }) => {
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
											`predictions-${day}-1-${new Date(startDate).getTime() - 1_000 * 60 * 15}`,
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
