import {
	ApplicationCommandType,
	InteractionResponseType,
	MessageFlags,
} from "discord-api-types/v10";
import { Command, loadMatchDay, normalizeError } from "../util";

export const getMatchDay = new Command({
	data: [
		{
			name: "get-match-day",
			description: "Load the next match day",
			type: ApplicationCommandType.ChatInput,
		},
	],
	isPrivate: true,
	async run(_interaction, { reply, env }) {
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
});
