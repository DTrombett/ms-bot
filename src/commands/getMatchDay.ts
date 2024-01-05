import {
	ApplicationCommandType,
	InteractionResponseType,
	MessageFlags,
} from "discord-api-types/v10";
import { createCommand, loadMatchDay, normalizeError } from "../util";

export const getMatchDay = createCommand({
	data: [
		{
			name: "get-match-day",
			description: "Load the next match day",
			type: ApplicationCommandType.ChatInput,
		},
	],
	isPrivate: true,
	async run(_interaction, { reply, env }) {
		let [queries, promise]:
			| Awaited<ReturnType<typeof loadMatchDay>>
			| [false, unknown] = await loadMatchDay(this.api, env).catch(
			(err: unknown) => [false, err],
		);

		if (queries)
			await Promise.all([env.DB.batch(queries), promise]).catch((err) => {
				queries = false;
				promise = err;
			});
		reply({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: {
				content: queries
					? "Done!"
					: `An error occurred: \`${normalizeError(promise).message}\``,
				flags: MessageFlags.Ephemeral,
			},
		});
	},
});
