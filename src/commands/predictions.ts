import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import { createCommand } from "../util";

export const predictionsCommand = createCommand({
	data: [
		{
			name: "predictions",
			description:
				"Invia e modifica i tuoi pronostici calcistici per divertirti con i risultati sportivi",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "send",
					description: "Invia i tuoi pronostici per la prossima giornata",
					type: ApplicationCommandOptionType.Subcommand,
				},
			],
		},
	],
	async run(interaction) {
		await interaction.reply("Lorem ipsum");
	},
});
