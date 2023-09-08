import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ModalActionRowComponentBuilder,
	ModalBuilder,
	RepliableInteraction,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { Document, MatchDay, MatchDaySchema, User } from "../models";
import { capitalize, createCommand } from "../util";

const predictionExamples = [
	"1",
	"X",
	"2",
	"1X",
	"12",
	"X2",
	"1 (2-0)",
	"1 (2-1)",
	"2 (0-2)",
	"2 (1-2)",
];
const checkMatchDay = async (
	matchDay: Document<MatchDaySchema> | null,
	interaction: RepliableInteraction,
) => {
	if (!matchDay) {
		await interaction.reply({
			ephemeral: true,
			content: "Non c'è alcun pronostico da inviare al momento!",
		});
		return true;
	}
	if (Date.now() >= matchDay.matches[0].date - 1_000 * 60 * 15) {
		await interaction.reply({
			ephemeral: true,
			content:
				"Puoi inviare i pronostici solo fino a 15 minuti dall'inizio del primo match della giornata!",
		});
		return true;
	}
	return false;
};

const predictionRegex =
	/^(?<prediction>1|x|2|1x|12|x2|1\s*\(\s*(?<first>\d+)\s*-\s*(?<second>\d+)\s*\)|2\s*\(\s*\d+\s*-\s*\d+\s*\))$/;

export const predictionsCommand = createCommand({
	data: [
		{
			name: "predictions",
			description:
				"Invia e modifica i tuoi pronostici calcistici per divertirti con i risultati sportivi",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "send",
					description: "Invia i tuoi pronostici per la prossima giornata",
					type: ApplicationCommandOptionType.Subcommand,
				},
			],
		},
	],
	async run(interaction) {
		const matchDay = await MatchDay.findOne({}).sort("-day");

		if (await checkMatchDay(matchDay, interaction)) return;
		await interaction.showModal(
			new ModalBuilder()
				.setCustomId(`predictions-${matchDay!.day}-1-2`)
				.setTitle(`Pronostici ${matchDay!.day}° Giornata (1/2)`)
				.addComponents(
					matchDay!.matches.slice(0, 5).map((match) =>
						new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
							new TextInputBuilder()
								.setCustomId(match.teams.join("-"))
								.setLabel(
									match.teams
										.map((team) =>
											team
												.split(" ")
												.map((word) => capitalize(word))
												.join(" "),
										)
										.join(" - "),
								)
								.setStyle(TextInputStyle.Short)
								.setRequired(true)
								.setPlaceholder(
									`es. ${
										predictionExamples[Math.floor(Math.random() * predictionExamples.length)]
									}`,
								),
						),
					),
				),
		);
	},
	async modalSubmit(interaction) {
		const matchDay = await MatchDay.findOne({}).sort("-day");

		if (await checkMatchDay(matchDay, interaction)) return;
		const [, day, part, total] = interaction.customId.split("-").map((n) => Number(n));

		if (day !== matchDay!.day) {
			await interaction.reply({
				ephemeral: true,
				content: "Questi pronostici sono scaduti!",
			});
			return;
		}
		const invalid: string[] = [];

		interaction.fields.fields.mapValues((field) => {
			const matches = field.value.trim().toLowerCase().match(predictionRegex);

			if (
				!matches?.groups ||
				matches.groups.first === matches.groups.second ||
				(matches[0].startsWith("1") && matches.groups.first < matches.groups.second) ||
				(matches[0].startsWith("2") && matches.groups.first > matches.groups.second)
			)
				invalid.push(field.data.label);
		});
		if (invalid.length) {
			await interaction.reply({
				ephemeral: true,
				content: `I pronostici inviati nei seguenti risultati non sono validi: ${invalid
					.map((text) => `**${text}**`)
					.join(", ")}`,
			});
			return;
		}
		const user =
			(await User.findById(interaction.user.id)) ?? new User({ _id: interaction.user.id });

		interaction.fields.fields.mapValues((field) => {
			const teams = field.data.label.split(" - ") as [string, string];
			const found = user.predictions?.find((prediction) =>
				prediction.teams.every((v, i) => v === teams[i]),
			);

			if (found) found.prediction = field.value;
			else (user.predictions ??= []).push({ teams, prediction: field.value });
		});
		if (part === total) {
			await interaction.reply({
				ephemeral: true,
				content: "Pronostici inviati correttamente!",
			});
			return;
		}
		// TODO
	},
});
