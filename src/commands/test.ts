import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionResponseType,
	type APIButtonComponent,
} from "discord-api-types/v10";
import { Command, loadMatches, type MatchData } from "../util";

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
		const matchDays: Record<string, MatchData[] | undefined> =
			Object.create(null);

		for (const match of matches)
			(matchDays[match.matchday.id] ??= []).push(match);
		const components: [APIButtonComponent[], APIButtonComponent[]] = [[], []];
		const locale = interaction.locale.split("-")[0]!.toUpperCase();
		const now = Date.now();

		// eslint-disable-next-line guard-for-in
		for (const matchDayId in matchDays) {
			const matchDay = matchDays[matchDayId]!;
			const firstMatch = matchDay[0]!;
			const firstRound = firstMatch.round.metaData.type === "GROUP_STANDINGS";

			components[Number(!firstRound)]!.push({
				type: ComponentType.Button,
				custom_id: `predictions-${matchDayId}-e`,
				style: firstRound ? ButtonStyle.Primary : ButtonStyle.Success,
				label: `${firstMatch.round.translations.name[locale] ?? firstMatch.round.metaData.name}${firstRound ? ` - ${firstMatch.matchday.translations.longName[locale] ?? firstMatch.matchday.longName}` : ""}`,
				disabled:
					matchDay.some(
						(m) =>
							m.awayTeam.teamTypeDetail === "FAKE" ||
							m.homeTeam.teamTypeDetail === "FAKE",
					) ||
					now >= Date.parse(firstMatch.kickOffTime.dateTime) - 15 * 60 * 1000,
				emoji: firstRound ? undefined : { name: "🏆" },
			});
		}
		reply({
			data: {
				content:
					"Invia i pronostici per il torneo tramite i pulsanti qui sotto. Hai tempo fino a 15 minuti prima dell'inizio di ciascuna giornata.",
				components: components.map((c) => ({
					type: ComponentType.ActionRow,
					components: c,
				})),
			},
			type: InteractionResponseType.ChannelMessageWithSource,
		});
	},
});
