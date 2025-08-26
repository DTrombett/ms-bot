import { inlineCode } from "@discordjs/formatters";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	type RESTPostAPIWebhookWithTokenJSONBody,
} from "discord-api-types/v10";
import {
	resolveColor,
	resolveCommandOptions,
	type CommandOptions,
	type RGB,
} from "../util";

export const color = {
	data: [
		{
			name: "color",
			description: "Scopri un colore!",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "name",
					description:
						"Nome del colore (es. red, #ff0000, rgb(255 0 0), hsl(0 100% 50%), hwb(0 0% 100%))",
					type: ApplicationCommandOptionType.String,
					required: true,
				},
			],
		},
	],
	run: async (reply, { interaction }) => {
		const { options } = resolveCommandOptions(color.data, interaction);
		let rgb: RGB;

		try {
			rgb = resolveColor(options.name);
		} catch (err) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: `Colore non valido: ${inlineCode((err as Error).message)}`,
				} satisfies RESTPostAPIWebhookWithTokenJSONBody,
			});
			return;
		}
		reply({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: {
				content: `Ecco il colore che hai richiesto: rgb(${rgb.join(", ")})`,
			} satisfies RESTPostAPIWebhookWithTokenJSONBody,
		});
	},
} as const satisfies CommandOptions<ApplicationCommandType.ChatInput>;
