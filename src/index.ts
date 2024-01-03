import { REST } from "@discordjs/rest";
import {
	APIVersion,
	InteractionResponseType,
	InteractionType,
} from "discord-api-types/v10";
import * as commandsObject from "./commands";
import type { Env } from "./util";
import {
	Command,
	JsonResponse,
	errorToResponse,
	loadMatchDay,
	verifyDiscordRequest,
} from "./util";

const rest = new REST({
	version: APIVersion,
	hashSweepInterval: 0,
	handlerSweepInterval: 0,
});
const commands = new Map(
	Object.entries(commandsObject).map(([key, command]) => [
		key,
		new Command(rest, command),
	]),
);
const applicationCommands = new Map(
	[...commands].flatMap(([, cmd]) => cmd.data.map((d) => [d.name, cmd])),
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
				let action: string | undefined, command: Command | undefined, result;

				switch (interaction.type) {
					case InteractionType.Ping:
						result = {
							type: InteractionResponseType.Pong,
						};
						break;
					case InteractionType.ApplicationCommand:
						command = applicationCommands.get(interaction.data.name);
						result = await command?.run(interaction, env, context);
						break;
					case InteractionType.MessageComponent:
						[action] = interaction.data.custom_id.split("-");
						if (!action) break;
						command = commands.get(action);
						result = await command?.component(interaction, env, context);
						break;
					case InteractionType.ApplicationCommandAutocomplete:
						command = commands.get(interaction.data.name);
						result = await command?.autocomplete(interaction, env, context);
						break;
					case InteractionType.ModalSubmit:
						[action] = interaction.data.custom_id.split("-");
						if (!action) break;
						command = commands.get(action);
						result = await command?.modalSubmit(interaction, env, context);
						break;
					default:
						break;
				}
				return new JsonResponse(result);
			}
			if (request.method === "GET") return new Response("Ready!");
			return new JsonResponse({ error: "Method Not Allowed" }, { status: 405 });
		}
		if (url.pathname === "/predictions/loadMatchDay") {
			if (request.method === "GET")
				return Response.json(await loadMatchDay(rest, env));
			return new JsonResponse({ error: "Method Not Allowed" }, { status: 405 });
		}
		return new JsonResponse({ error: "Not Found" }, { status: 404 });
	},
};

export default server;
