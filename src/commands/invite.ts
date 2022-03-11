import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("invite")
		.setDescription("Invita il bot nel tuo server"),
	// isPublic: true,
	async run(interaction) {
		await interaction.reply({
			content: "Attualmente non è possibile invitare il bot nel tuo server!",
			// components: [
			// 	{
			// 		type: ComponentType.ActionRow,
			// 		components: [
			// 			{
			// 				type: ComponentType.Button,
			// 				label: "Invita il bot",
			// 				style: ButtonStyle.Link,
			// 				url: `https://discord.com/api/oauth2/authorize?client_id=${
			// 					this.client.application.id
			// 				}&permissions=${
			// 					this.client.application.installParams.permissions
			// 				}&scope=${this.client.application.installParams.scopes.join(
			// 					"%20"
			// 				)}`,
			// 				emoji: { name: "🤖" },
			// 			},
			// 		],
			// 	},
			// ],
		});
	},
};
