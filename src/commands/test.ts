import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
} from "discord-api-types/v10";
import { Command, createMatchDayComponents, loadMatches } from "../util";

export const test = new Command({
	data: [
		{
			name: "test",
			description: "Test!",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "data",
					description: "The data to send",
					type: ApplicationCommandOptionType.String,
				},
			],
		},
	],
	isPrivate: true,
	async run(interaction, { reply }) {
		// const data = interaction.data
		// .options![0] as APIApplicationCommandInteractionDataStringOption;

		// reply(JSON.parse(data.value));
		const matches = await loadMatches();

		reply({
			data: {
				content:
					"Invia i pronostici per il torneo tramite i pulsanti qui sotto. Hai tempo fino a 15 minuti prima dell'inizio di ciascuna giornata.",
				components: createMatchDayComponents(
					matches,
					interaction.locale.split("-")[0]!.toUpperCase(),
				),
			},
			type: InteractionResponseType.ChannelMessageWithSource,
		});
	},
});
