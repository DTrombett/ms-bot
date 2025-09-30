import {
	ApplicationCommandType,
	InteractionResponseType,
	MessageFlags,
} from "discord-api-types/v10";
import { formatTime, type CommandOptions } from "../util";

export const editedAfter = {
	data: [
		{
			name: "Edited After",
			type: ApplicationCommandType.Message,
		},
	],
	run: (reply, { interaction }) => {
		const [message] = Object.values(interaction.data.resolved.messages);

		if (!message?.edited_timestamp) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "Questo messaggio non è stato modificato.",
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		reply({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: {
				content: `Messaggio modificato dopo **${formatTime(Date.parse(message.edited_timestamp) - Date.parse(message.timestamp))}**`,
			},
		});
	},
} as const satisfies CommandOptions<ApplicationCommandType.Message>;
