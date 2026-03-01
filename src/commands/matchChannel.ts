import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ChannelType,
	InteractionContextType,
	MessageFlags,
	PermissionFlagsBits,
	Routes,
	type RESTAPIGuildCreateOverwrite,
	type RESTPostAPIApplicationCommandsJSONBody,
	type RESTPostAPIGuildChannelJSONBody,
	type RESTPostAPIGuildChannelResult,
} from "discord-api-types/v10";
import Command from "../Command.ts";
import { rest } from "../util/globals.ts";
import { ok } from "../util/node.ts";
import normalizeError from "../util/normalizeError.ts";

export class MatchChannel extends Command {
	static override chatInputData = {
		name: "match-channel",
		description: "Gestisci i canali per i match",
		type: ApplicationCommandType.ChatInput,
		contexts: [InteractionContextType.Guild],
		default_member_permissions: "0",
		options: [
			{
				name: "create",
				description: "Crea un nuovo canale privato",
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: "category",
						description: "La categoria in cui creare il canale",
						type: ApplicationCommandOptionType.Channel,
						required: true,
						channel_types: [ChannelType.GuildCategory],
					},
					{
						name: "name",
						description: "Il nome del canale",
						type: ApplicationCommandOptionType.String,
						required: true,
						max_length: 100,
					},
					{
						name: "role",
						description: "Un ruolo a cui dare l'accesso",
						type: ApplicationCommandOptionType.Role,
					},
					{
						name: "user1",
						description: "Primo utente a cui dare l'accesso",
						type: ApplicationCommandOptionType.User,
					},
					{
						name: "user2",
						description: "Secondo utente a cui dare l'accesso",
						type: ApplicationCommandOptionType.User,
					},
					{
						name: "user3",
						description: "Terzo utente a cui dare l'accesso",
						type: ApplicationCommandOptionType.User,
					},
					{
						name: "user4",
						description: "Quarto utente a cui dare l'accesso",
						type: ApplicationCommandOptionType.User,
					},
					{
						name: "user5",
						description: "Quinto utente a cui dare l'accesso",
						type: ApplicationCommandOptionType.User,
					},
					{
						name: "user6",
						description: "Sesto utente a cui dare l'accesso",
						type: ApplicationCommandOptionType.User,
					},
				],
			},
		],
	} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
	static create = async (
		{ reply, edit }: ChatInputReplies,
		{
			interaction: { guild_id, app_permissions },
			options,
		}: ChatInputArgs<typeof MatchChannel.chatInputData, "create">,
	) => {
		ok(guild_id);
		if (!(BigInt(app_permissions) & PermissionFlagsBits.ManageChannels))
			return reply({
				content: "Non ho i permessi per gestire i canali!",
				flags: MessageFlags.Ephemeral,
			});
		reply({ content: "Creando il canale..." });
		const permission_overwrites: RESTAPIGuildCreateOverwrite[] = [
			options.user1,
			options.user2,
			options.user3,
			options.user4,
			options.user5,
			options.user6,
		]
			.filter((o) => o != null)
			.map((id) => ({
				id,
				type: 1,
				allow: String(PermissionFlagsBits.ViewChannel),
			}));

		if (options.role)
			permission_overwrites.push({
				id: options.role,
				type: 0,
				allow: String(PermissionFlagsBits.ViewChannel),
			});
		permission_overwrites.push({
			id: guild_id,
			type: 0,
			deny: String(PermissionFlagsBits.ViewChannel),
		});
		try {
			return edit({
				content: `Canale <#${
					(
						(await rest.post(Routes.guildChannels(guild_id), {
							body: {
								name: options.name,
								type: ChannelType.GuildText,
								permission_overwrites,
								parent_id: options.category,
							} satisfies RESTPostAPIGuildChannelJSONBody,
						})) as RESTPostAPIGuildChannelResult
					).id
				}> creato!`,
			});
		} catch (err) {
			return edit({ content: normalizeError(err).message });
		}
	};
}
