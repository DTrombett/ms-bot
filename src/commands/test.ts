import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	MessageFlags,
	Routes,
	type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { Command, createMatchDayComponents, loadMatches, rest } from "../util";

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
	async run(interaction, { reply, env }) {
		// const data = interaction.data
		// .options![0] as APIApplicationCommandInteractionDataStringOption;

		// reply(JSON.parse(data.value));
		await rest.post(Routes.channelMessages(env.PREDICTIONS_CHANNEL), {
			body: {
				content:
					"Invia i pronostici per il torneo tramite i pulsanti qui sotto. Hai tempo fino a 15 minuti prima dell'inizio di ciascuna giornata!",
				components: createMatchDayComponents(
					await loadMatches(),
					interaction.locale.split("-")[0]!.toUpperCase(),
				),
			} satisfies RESTPostAPIChannelMessageJSONBody,
		});
		reply({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: { content: "Done!", flags: MessageFlags.Ephemeral },
		});
	},
});
