import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	type RESTPostAPIWebhookWithTokenJSONBody,
} from "discord-api-types/v10";
import { resolveCommandOptions, type CommandOptions } from "../util";

export const color = {
	data: [
		{
			name: "color",
			description: "Scopri un colore!",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "name",
					description: "Nome del colore (es. red, #ff0000, rgb(255,0,0))",
					type: ApplicationCommandOptionType.String,
					required: true,
				},
			],
		},
	],
	run: async (reply, { interaction }) => {
		const { options } = resolveCommandOptions(color.data, interaction);

		reply({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: {
				content: `Ecco il colore che hai richiesto: ${options.name}`,
			} satisfies RESTPostAPIWebhookWithTokenJSONBody,
		});
	},
} as const satisfies CommandOptions<ApplicationCommandType.ChatInput>;
