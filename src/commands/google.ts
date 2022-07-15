import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
} from "discord-api-types/v10";
import { escapeMarkdown } from "discord.js";
import { createCommand } from "../util";

export const command = createCommand({
	data: [
		{
			name: "google",
			description: "Cerca qualcosa su Google",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "query",
					description: "La query da cercare",
					type: ApplicationCommandOptionType.String,
					required: true,
				},
			],
		},
	],
	async run(interaction) {
		const query = interaction.options.data[0].value;

		if (typeof query !== "string") {
			await interaction.reply({
				content: "Query non valida!",
			});
			return;
		}
		await interaction.reply({
			content: `Risultati per la ricerca "**${escapeMarkdown(query)}**":`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							label: "Apri nel browser!",
							style: ButtonStyle.Link,
							emoji: { name: "🔍" },
							url: `https://google.com/search?q=${encodeURIComponent(query)}`,
						},
					],
				},
			],
		});
	},
});
