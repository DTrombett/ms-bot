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
import type { CommandOptions, Env, Handler, RGB } from "./util";
import {
	createSolidPng,
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
	({ interaction, env, context, host }) =>
		executeInteraction(
			interaction,
			env,
			context,
			host,
			"run",
			applicationCommands[interaction.data.name],
		),
	({ interaction, env, context, host }) =>
		executeInteraction(
			interaction,
			env,
			context,
			host,
			"component",
			commands[interaction.data.custom_id.split("-")[0]!],
		),
	({ interaction, env, context, host }) =>
		executeInteraction(
			interaction,
			env,
			context,
			host,
			"autocomplete",
			commands[interaction.data.name],
		),
	({ interaction, env, context, host }) =>
		executeInteraction(
			interaction,
			env,
			context,
			host,
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
					host: url.host,
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
		if (url.pathname === "/color") {
			if (request.method !== "GET")
				return new JsonResponse(
					{ error: "Method Not Allowed" },
					{ status: 405 },
				);
			const rgb = [
				url.searchParams.get("red"),
				url.searchParams.get("green"),
				url.searchParams.get("blue"),
			].map(Number) as RGB;
			if (rgb.some(isNaN))
				return new JsonResponse(
					{ error: "Missing 'red', 'green' or 'blue' query parameter" },
					{ status: 400 },
				);
			return new Response(await createSolidPng(256, 256, ...rgb), {
				headers: { "Content-Type": "image/png" },
			});
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

export default server;
