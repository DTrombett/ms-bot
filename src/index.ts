import {
	InteractionResponseType,
	InteractionType,
} from "discord-api-types/v10";
import * as commandsObject from "./commands";
import type { Env } from "./util";
import {
	Command,
	JsonResponse,
	errorToResponse,
	info,
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
							`Command ${interaction.data.name} executed by ${(
								interaction.member ?? interaction
							).user?.username} in ${interaction.channel.name} (${
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
							`Component interaction ${action} executed by ${(
								interaction.member ?? interaction
							).user?.username} in ${interaction.channel.name} (${
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
							`Modal interaction ${action} executed by ${(
								interaction.member ?? interaction
							).user?.username} in ${interaction.channel?.name} (${interaction
								.channel?.id}) - guild ${interaction.guild_id}`,
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
};

export default server;
