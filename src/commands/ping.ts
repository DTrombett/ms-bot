import { DiscordSnowflake } from "@sapphire/snowflake";
import {
	APIMessage,
	ApplicationCommandType,
	InteractionResponseType,
	RESTPatchAPIWebhookWithTokenMessageJSONBody,
	Routes,
} from "discord-api-types/v10";
import { createCommand } from "../util";

export const ping = createCommand({
	data: [
		{
			name: "ping",
			description: "Pong!",
			type: ApplicationCommandType.ChatInput,
		},
	],
	async run(interaction, { reply }) {
		const now = Date.now();

		reply({ type: InteractionResponseType.DeferredChannelMessageWithSource });
		const { id, edited_timestamp } = (await this.api.get(
			Routes.webhookMessage(interaction.application_id, interaction.token),
		)) as APIMessage;
		const timestamp = DiscordSnowflake.timestampFrom(interaction.id);

		await this.api.patch(
			Routes.webhookMessage(interaction.application_id, interaction.token),
			{
				body: {
					content: `🏓 **Pong!**\nRitardo relativo: **${
						now - timestamp
					}ms**\nRitardo totale: **${
						(edited_timestamp
							? new Date(edited_timestamp).getTime()
							: DiscordSnowflake.timestampFrom(id)) - timestamp
					}ms**`,
				} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
			},
		);
	},
});
