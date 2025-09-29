import {
	APIMessage,
	ApplicationCommandType,
	InteractionResponseType,
	RESTPatchAPIWebhookWithTokenMessageJSONBody,
	Routes,
} from "discord-api-types/v10";
import {
	idDiff,
	idToTimestamp,
	rest,
	timeout,
	type CommandOptions,
} from "../util";

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
		await timeout(1_000);
		const { id } = (await rest.get(
			Routes.webhookMessage(interaction.application_id, interaction.token),
		)) as APIMessage;
		await rest.patch(
			Routes.webhookMessage(interaction.application_id, interaction.token),
			{
				body: {
					content: `🏓 **Pong!**\nRitardo relativo: **${
						now - idToTimestamp(interaction.id)
					}ms**\nRitardo totale: **${idDiff(id, interaction.id)}ms**`,
				} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
			},
		);
	},
};
