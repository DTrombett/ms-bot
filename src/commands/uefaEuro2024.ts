import { EmbedBuilder, time } from "@discordjs/builders";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	MessageFlags,
	type APIApplicationCommandInteractionDataSubcommandOption,
} from "discord-api-types/v10";
import { Command, flagEmojis, loadMatches, type MatchData } from "../util";

export const uefaEuro2024 = new Command({
	data: [
		{
			name: "uefa-euro-2024",
			description: "Scopri i dettagli del campionato europeo di calcio 2024!",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "matches",
					description: "Le partite del torneo",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "team",
							description: "Filtra le partite di una squadra specifica",
							type: ApplicationCommandOptionType.String,
							choices: [
								{ name: "Poland", value: "109" },
								{ name: "Portugal", value: "110" },
								{ name: "Romania", value: "113" },
								{ name: "Scotland", value: "117" },
								{ name: "Spain", value: "122" },
								{ name: "Switzerland", value: "128" },
								{ name: "Albania", value: "2" },
								{ name: "Türkiye", value: "135" },
								{ name: "Austria", value: "8" },
								{ name: "Belgium", value: "13" },
								{ name: "Serbia", value: "147" },
								{ name: "Denmark", value: "35" },
								{ name: "England", value: "39" },
								{ name: "France", value: "43" },
								{ name: "Germany", value: "47" },
								{ name: "Croatia", value: "56370" },
								{ name: "Hungary", value: "57" },
								{ name: "Italy", value: "66" },
								{ name: "Georgia", value: "57157" },
								{ name: "Slovenia", value: "57163" },
								{ name: "Ukraine", value: "57166" },
								{ name: "Slovakia", value: "58836" },
								{ name: "Czechia", value: "58837" },
								{ name: "Netherlands", value: "95" },
							],
						},
						{
							name: "match-day",
							description: "Filtra le partite di una giornata specifica",
							type: ApplicationCommandOptionType.String,
							choices: [
								{ name: "Group stage - Matchday 1", value: "33779" },
								{ name: "Group stage - Matchday 2", value: "33780" },
								{ name: "Group stage - Matchday 3", value: "33781" },
								{ name: "Round of 16", value: "33782" },
								{ name: "Quarter-finals", value: "33783" },
								{ name: "Semi-finals", value: "33784" },
								{ name: "Final", value: "33785" },
							],
						},
					],
				},
			],
		},
	],
	async run(interaction, { reply }) {
		const subCommand = interaction.data.options!.find(
			(o): o is APIApplicationCommandInteractionDataSubcommandOption =>
				o.type === ApplicationCommandOptionType.Subcommand,
		)!;
		const locale = interaction.locale.split("-")[0]!.toUpperCase();
		const options: Record<string, boolean | number | string> = {};

		if (subCommand.options)
			for (const option of subCommand.options)
				options[option.name] = option.value;
		if (subCommand.name === "matches") {
			const matches = await loadMatches(
				options["match-day"] as string,
				options.team as string,
			);
			const matchDays: Record<string, MatchData[] | undefined> =
				Object.create(null);
			const now = Date.now();

			for (const match of matches)
				(matchDays[match.matchday.id] ??= []).push(match);
			if (!matches.length) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: "Nessuna partita trovata!",
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					embeds: Object.keys(matchDays).map((matchDayId) => {
						const dayMatches = matchDays[matchDayId]!;
						const { round, matchday } = dayMatches[0]!;

						return new EmbedBuilder()
							.setThumbnail(
								"https://upload.wikimedia.org/wikipedia/it/f/f0/UEFA_Euro_2024_Logo.png",
							)
							.setTitle(
								`${now >= Date.parse(matchday.dateFrom) && Date.parse(matchday.dateTo) > now ? "🔴 " : ""}${round.translations?.name?.[locale] ?? "Fase a gironi"}${round.metaData.type === "GROUP_STANDINGS" ? ` - ${matchday.translations?.longName?.[locale] ?? matchday.longName}` : ""}`,
							)
							.addFields(
								dayMatches.map((m) => ({
									name: `${flagEmojis[m.homeTeam.countryCode] ?? ""} ${m.homeTeam.translations?.displayName?.[locale] ?? m.homeTeam.internationalName}${m.score ? ` **${m.score.total.home}**` : ""} - ${m.score ? `**${m.score.total.away}** ` : ""}${m.awayTeam.translations?.displayName?.[locale] ?? m.awayTeam.internationalName} ${flagEmojis[m.awayTeam.countryCode] ?? ""}`,
									value: `${m.status === "UPCOMING" ? time(new Date(m.kickOffTime.dateTime)) : m.status === "LIVE" ? (m.phase === "HALF_TIME_BREAK" ? "🔴 **Live** - Intervallo" : `🔴 **Live** - ${m.minute?.normal}'`) : ""}\n${m.group ? m.group.translations?.name?.[locale] ?? m.group.metaData.groupName : ""}`,
								})),
							)
							.setAuthor({
								name: "UEFA EURO 2024",
								url: "https://uefa.com/euro2024",
							})
							.setColor(0x004f9f)
							.toJSON();
					}),
				},
			});
		}
	},
});
