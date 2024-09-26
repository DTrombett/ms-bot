import {
	ApplicationCommandType,
	InteractionResponseType,
	MessageFlags,
} from "discord-api-types/v10";
import { loadMatchDay, normalizeError, type CommandOptions } from "../util";

export const getMatchDay: CommandOptions<ApplicationCommandType.ChatInput> = {
	data: [
		{
			name: "get-match-day",
			description: "Load the next match day",
			type: ApplicationCommandType.ChatInput,
		},
	],
	isPrivate: true,
	run: async (reply, { env }) => {
		const error = await loadMatchDay(env).catch((err: unknown) => err);

		reply({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: {
				content: error
					? `An error occurred: \`${normalizeError(error).message}\``
					: "Done!",
				flags: MessageFlags.Ephemeral,
			},
		});
	},
};
