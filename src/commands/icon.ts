import { escapeMarkdown } from "@discordjs/formatters";
import {
	APIGuild,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionResponseType,
	MessageFlags,
	Routes,
} from "discord-api-types/v10";
import { Command, rest } from "../util";

export const icon = new Command({
	data: [
		{
			name: "icon",
			description: "Mostra l'icona del server",
			type: ApplicationCommandType.ChatInput,
		},
	],
	async run(interaction, { reply }) {
		if (!interaction.guild_id) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: MessageFlags.Ephemeral,
					content:
						"Questo comando può essere eseguito solo all'interno di un server!",
				},
			});
			return;
		}
		const guild = (await rest.get(
			Routes.guild(interaction.guild_id),
		)) as APIGuild;

		if (guild.icon == null) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "Questo server non ha un'icona!",
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		const url = rest.cdn.icon(interaction.guild_id, guild.icon, {
			size: 4096,
			extension: "png",
		});

		reply({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: {
				content: `Icona di **[${escapeMarkdown(guild.name)}](${url} )**:`,
				allowed_mentions: { parse: [] },
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								label: "Apri l'originale",
								style: ButtonStyle.Link,
								url,
							},
						],
					},
				],
			},
		});
	},
});
