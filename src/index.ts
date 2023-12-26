import { REST } from "@discordjs/rest";
import {
	ApplicationCommandType,
	InteractionResponseType,
	InteractionType,
} from "discord-api-types/v10";
import * as commandsObject from "./commands";
import type { Env } from "./util";
import {
	Command,
	JsonResponse,
	errorToResponse,
	verifyDiscordRequest,
} from "./util";

const rest = new REST({
	version: "10",
	hashSweepInterval: 0,
	handlerSweepInterval: 0,
});
const commands = Object.values(commandsObject).map(
	(command) => new Command(rest, command),
);

const server: ExportedHandler<Env> = {
	fetch: async (request, env) => {
		rest.setToken(env.DISCORD_TOKEN);
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
					command = commands.find((c) =>
						c.data.some(
							(d) =>
								d.type === interaction.data.type &&
								d.name === interaction.data.name,
						),
					);
					result = await command?.run(interaction, env);
					break;
				case InteractionType.MessageComponent:
					[action] = interaction.data.custom_id.split("-");
					command = commands.find(
						(cmd) =>
							(cmd.data.find(
								({ type }) => type === ApplicationCommandType.ChatInput,
							)?.name ?? cmd.data[0]!.name) === action,
					);
					result = await command?.component(interaction, env);
					break;
				case InteractionType.ApplicationCommandAutocomplete:
					command = commands.find(
						(cmd) =>
							(cmd.data.find(
								({ type }) => type === ApplicationCommandType.ChatInput,
							)?.name ?? cmd.data[0]!.name) === interaction.data.name,
					);
					result = await command?.autocomplete(interaction, env);
					break;
				case InteractionType.ModalSubmit:
					[action] = interaction.data.custom_id.split("-");
					command = commands.find(
						(cmd) =>
							(cmd.data.find(
								({ type }) => type === ApplicationCommandType.ChatInput,
							)?.name ?? cmd.data[0]!.name) === action,
					);
					result = await command?.modalSubmit(interaction, env);
					break;
				default:
					break;
			}
			console.log(
				`Interaction ${
					interaction.data && "name" in interaction.data
						? interaction.data.name
						: command?.data[0]!.name
				} handled correctly`,
			);
			return result
				? new JsonResponse(result)
				: new JsonResponse({ error: "An error occurred" }, { status: 500 });
		}
		if (request.method === "GET") return new Response("Ready!");
		return new JsonResponse({ error: "Not Found" }, { status: 404 });
	},
};

export default server;
