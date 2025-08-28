/* eslint-disable no-sparse-arrays */
import {
	APIApplicationCommandAutocompleteInteraction,
	APIApplicationCommandInteraction,
	APIMessageComponentInteraction,
	APIModalSubmitInteraction,
	APIPingInteraction,
	InteractionResponseType,
} from "discord-api-types/v10";
import * as commandsObject from "./commands";
import type { CommandOptions, Env, Handler } from "./util";
import {
	executeInteraction,
	JsonResponse,
	rest,
	verifyDiscordRequest,
} from "./util";

const commands = commandsObject as Record<string, CommandOptions>;
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
	scheduled: async ({}, env) => {
		await env.PREDICTIONS_REMINDERS.create();
	},
};

export { LiveMatch } from "./LiveMatch";
export { LiveScore } from "./LiveScore";
export { PredictionsReminders } from "./PredictionsReminders";
export { Reminder } from "./Reminder";
export { Shorten } from "./Shorten";
export { BrawlStarsMonitor } from "./BrawlStarsMonitor";

export default server;
