import { ApplicationCommandType, ButtonStyle, ComponentType } from "discord-api-types/v10";
import { escapeMarkdown } from "discord.js";
import { createCommand } from "../util";

export const iconCommand = createCommand({
	data: [
		{
			name: "icon",
			description: "Mostra l'icona del server",
			type: ApplicationCommandType.ChatInput,
		},
	],
	async run(interaction) {
		if (!interaction.inCachedGuild()) {
			await interaction.reply({
				content: "Questo comando può essere usato solo all'interno di un server!",
				ephemeral: true,
			});
			return;
		}
		const url = interaction.guild.iconURL({ extension: "png", size: 4096 });

		if (url == null) {
			await interaction.reply({
				content: "Questo server non ha un'icona!",
				ephemeral: true,
			});
			return;
		}
		await interaction.reply({
			content: `Icona di **[${escapeMarkdown(interaction.guild.name)}](${url} )**:`,
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
		});
	},
});
