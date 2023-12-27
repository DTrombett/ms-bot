import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	escapeMarkdown,
} from "discord.js";
import { createCommand } from "../util";

export const bannerCommand = createCommand({
	data: [
		{
			name: "banner",
			description: "Mostra il banner di un utente",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "user",
					description: "L'utente di cui mostrare il banner",
					type: ApplicationCommandOptionType.User,
				},
			],
		},
	],
	async run(interaction) {
		let user = interaction.options.getUser("user") ?? interaction.user;

		if (user.banner === undefined) user = await user.fetch(true);
		if (user.banner == null) {
			await interaction.reply({
				content: "L'utente non ha un banner!",
				ephemeral: true,
			});
			return;
		}
		const url = user.bannerURL({
			extension: "png",
			size: 4096,
		})!;

		await interaction.reply({
			content: `Banner di **[${escapeMarkdown(user.username)}](${url} )**:`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							url,
							style: ButtonStyle.Link,
							label: "Apri l'originale",
						},
					],
				},
			],
		});
	},
});
