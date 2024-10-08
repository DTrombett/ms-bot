import { DiscordSnowflake } from "@sapphire/snowflake";
import {
	APIMessage,
	ApplicationCommandType,
	InteractionResponseType,
	RESTPatchAPIWebhookWithTokenMessageJSONBody,
	Routes,
} from "discord-api-types/v10";
import { setTimeout } from "node:timers/promises";
import { rest, type CommandOptions } from "../util";

export const ping: CommandOptions<ApplicationCommandType.ChatInput> = {
	data: [
		{
			name: "ping",
			description: "Pong!",
			type: ApplicationCommandType.ChatInput,
		},
	],
	run: async (reply, { interaction }) => {
		const now = Date.now();

		reply({ type: InteractionResponseType.DeferredChannelMessageWithSource });
		await setTimeout(1_000);
		const { id } = (await rest.get(
			Routes.webhookMessage(interaction.application_id, interaction.token),
		)) as APIMessage;
		const timestamp = DiscordSnowflake.timestampFrom(interaction.id);

		await rest.patch(
			Routes.webhookMessage(interaction.application_id, interaction.token),
			{
				body: {
					content: `🏓 **Pong!**\nRitardo relativo: **${
						now - timestamp
					}ms**\nRitardo totale: **${
						DiscordSnowflake.timestampFrom(id) - timestamp
					}ms**`,
				} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
			},
		);
	},
};
