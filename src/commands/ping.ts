import { ApplicationCommandType, ButtonStyle, ComponentType } from "discord-api-types/v10";
import type { Interaction, InteractionReplyOptions, InteractionUpdateOptions } from "discord.js";
import { createCommand } from "../util";

const ping = (interaction: Interaction): InteractionReplyOptions & InteractionUpdateOptions => ({
	content: `WS: **${interaction.client.ws.ping}ms**\nRitardo totale: **${
		Date.now() - interaction.createdTimestamp
	}ms**`,
	components: [
		{
			type: ComponentType.ActionRow,
			components: [
				{
					type: ComponentType.Button,
					custom_id: "ping",
					label: "Pong!",
					style: ButtonStyle.Success,
					emoji: { name: "🏓" },
				},
			],
		},
	],
});

export const pingCommand = createCommand({
	data: [
		{
			name: "ping",
			description: "Pong!",
			type: ApplicationCommandType.ChatInput,
		},
	],
	async run(interaction) {
		await interaction.reply(ping(interaction));
	},
	async component(interaction) {
		await interaction.update(ping(interaction));
	},
});
