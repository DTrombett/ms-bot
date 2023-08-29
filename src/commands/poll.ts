import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import { createCommand } from "../util";

export const pollCommand = createCommand({
	data: [
		{
			name: "poll",
			description: "Crea un sondaggio",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "question",
					description: "La domanda da porre",
					type: ApplicationCommandOptionType.String,
					required: true,
					min_length: 1,
					max_length: 256,
				},
			],
		},
	],
	async run(interaction) {
		const title = interaction.options.data[0].value;

		if (typeof title !== "string") {
			await interaction.reply({
				content: "Domanda non valida!",
			});
			return;
		}
		await interaction
			.reply({
				embeds: [
					{
						title,
						author: {
							name: interaction.user.tag,
							icon_url: interaction.user.avatarURL({ extension: "png" }) ?? undefined,
						},
						color: 0xfd6500,
						description: "✅ **Sì**\n\n❌ **No**",
						timestamp: new Date().toISOString(),
					},
				],
				fetchReply: true,
			})
			.then((r) => Promise.all([r.react("✅"), r.react("❌")]));
	},
});
