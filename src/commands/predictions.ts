import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Colors,
	MessageComponentInteraction,
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
	"1 (1-0)",
	"1 (2-1)",
	"2 (0-1)",
	"2 (1-2)",
	"X (0-0)",
	"X (1-1)",
];
const predictionRegex =
	/^(1|x|2|1x|12|x2|((?<prediction>1|2|x)\s*\(\s*(?<first>\d+)\s*-\s*(?<second>\d+)\s*\)))$/;
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
const showModal = async (
	interaction: ChatInputCommandInteraction | MessageComponentInteraction,
	matchDay: Document<MatchDaySchema>,
	part: number,
	user?: Document<typeof User>,
	editing = false,
) => {
	const total = matchDay.matches.length / 5;

	return interaction.showModal(
		new ModalBuilder()
			.setCustomId(`predictions-${matchDay.day}-${part}-${Number(editing)}`)
			.setTitle(`Pronostici ${matchDay.day}° Giornata (${part}/${total})`)
			.addComponents(
				matchDay.matches.slice((part - 1) * 5, part * 5).map((match) => {
					const textInput = new TextInputBuilder()
						.setCustomId(match.teams)
						.setLabel(match.teams)
						.setStyle(TextInputStyle.Short)
						.setRequired(true)
						.setPlaceholder(
							`es. ${
								predictionExamples[
									Math.floor(Math.random() * predictionExamples.length)
								]
							}`,
						);
					const found = user?.predictions?.find(
						(prediction) => prediction.teams === match.teams,
					);

					if (found) textInput.setValue(found.prediction);
					return new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
						textInput,
					);
				}),
			),
	);
};

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
				{
					name: "edit",
					description: "Modifica i tuoi pronostici per la prossima giornata",
					type: ApplicationCommandOptionType.Subcommand,
				},
				{
					name: "view",
					description:
						"Visualizza i tuoi pronostici o quelli di un altro utente",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							type: ApplicationCommandOptionType.User,
							name: "user",
							description: "L'utente di cui vedere i pronostici",
						},
					],
				},
			],
		},
	],
	async run(interaction) {
		const subCommand = interaction.options.getSubcommand();
		const matchDay = await MatchDay.findOne({}).sort("-day");

		if (subCommand === "view") {
			if (!matchDay) {
				await interaction.reply({
					ephemeral: true,
					content: "Non c'è alcun pronostico da visualizzare al momento!",
				});
				return;
			}
			const option = interaction.options.get("user");

			if (
				option &&
				option.value !== interaction.user.id &&
				Date.now() < matchDay.matches[0].date - 1_000 * 60 * 15
			) {
				await interaction.reply({
					ephemeral: true,
					content:
						"Non puoi vedere i pronostici degli altri utenti prima dell'inizio della giornata!",
				});
				return;
			}
			const { member, user } = option ?? interaction;

			if (!user) {
				await interaction.reply({
					ephemeral: true,
					content: "Utente non trovato!",
				});
				return;
			}
			const existingUser = await User.findById(user.id);

			if (!existingUser?.predictions || existingUser.predictions.length === 0) {
				await interaction.reply({
					ephemeral: true,
					content: "L'utente non ha inviato alcun pronostico per la giornata!",
				});
				return;
			}
			await interaction.reply({
				ephemeral: true,
				embeds: [
					{
						author: {
							name:
								(member && "displayName" in member
									? member.displayName
									: member?.nick) ?? user.displayName,
							icon_url:
								(member && "displayAvatarURL" in member
									? member.displayAvatarURL({ extension: "png" })
									: member?.avatar != null && interaction.guildId != null
									? this.client.rest.cdn.guildMemberAvatar(
											interaction.guildId,
											user.id,
											member.avatar,
											{ extension: "png" },
									  )
									: undefined) ??
								interaction.user.displayAvatarURL({ extension: "png" }),
						},
						color: Colors.Blue,
						fields: matchDay.matches.map((match) => ({
							name: `${match.teams} (<t:${Math.round(match.date / 1000)}:F>)`,
							value:
								existingUser.predictions!.find(
									(predict) => predict.teams === match.teams,
								)?.prediction ?? "*Non presente*",
						})),
						thumbnail: {
							url: "https://img.legaseriea.it/vimages/64df31f4/Logo-SerieA_TIM_RGB.jpg",
						},
						title: `${matchDay.day}° Giornata Serie A TIM`,
						url: "https://legaseriea.it/it/serie-a",
					},
				],
			});
			return;
		}
		if (await checkMatchDay(matchDay, interaction)) return;
		const user = await User.findById(interaction.user.id);

		if (
			subCommand === "send" &&
			user?.predictions?.length === matchDay!.matches.length
		) {
			await interaction.reply({
				ephemeral: true,
				content:
					"Hai già inviato i pronostici per questa giornata! Clicca il pulsante se vuoi modificarli...",
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId(`predictions-${matchDay!.day}-1-1`)
							.setEmoji("✏️")
							.setLabel("Modifica")
							.setStyle(ButtonStyle.Success),
					),
				],
			});
			return;
		}
		await showModal(interaction, matchDay!, 1, user ?? undefined);
	},
	async modalSubmit(interaction) {
		const matchDay = await MatchDay.findOne({}).sort("-day");

		if (await checkMatchDay(matchDay, interaction)) return;
		const [, day, part, editing] = interaction.customId
			.split("-")
			.map((n) => Number(n));
		const total = matchDay!.matches.length / 5;

		if (day !== matchDay!.day) {
			await interaction.reply({
				ephemeral: true,
				content: "Questi pronostici sono scaduti!",
			});
			return;
		}
		const invalid: string[] = [];
		const resolved: Record<string, string> = {};

		interaction.fields.fields.mapValues((field) => {
			const value = field.value.trim();
			const matches = value.toLowerCase().match(predictionRegex);

			if (
				!matches?.groups ||
				(matches[0].startsWith("x") &&
					matches.groups.first !== matches.groups.second) ||
				(matches[0].startsWith("1") &&
					matches.groups.first &&
					matches.groups.first < matches.groups.second) ||
				(matches[0].startsWith("2") &&
					matches.groups.first &&
					matches.groups.first > matches.groups.second) ||
				(matches.groups.first && Number(matches.groups.first) > 999) ||
				(matches.groups.second && Number(matches.groups.second) > 999)
			)
				invalid.push(
					field.customId
						.split("-")
						.map((team) =>
							team
								.split(" ")
								.map((word) => capitalize(word))
								.join(" "),
						)
						.join(" - "),
				);
			else
				resolved[field.value] = matches.groups.prediction
					? `${matches.groups.prediction.toUpperCase()} (${
							matches.groups.first
					  } - ${matches.groups.second})`
					: value.toUpperCase();
		});
		const user =
			(await User.findById(interaction.user.id)) ??
			new User({ _id: interaction.user.id });

		interaction.fields.fields.mapValues((field) => {
			if (!resolved[field.value]) return;
			const found = user.predictions?.find(
				(prediction) => prediction.teams === field.customId,
			);

			if (found) found.prediction = resolved[field.value];
			else
				(user.predictions ??= []).push({
					teams: field.customId,
					prediction: resolved[field.value],
				});
		});
		await user.save();
		if (invalid.length) {
			await interaction.reply({
				ephemeral: true,
				content: `I pronostici inviati nei seguenti risultati non sono validi: ${invalid
					.map((text) => `**${text}**`)
					.join(", ")}`,
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId(`predictions-${matchDay!.day}-${part}-1`)
							.setEmoji("✏️")
							.setLabel("Modifica")
							.setStyle(ButtonStyle.Success),
					),
				],
			});
			return;
		}
		if (part === total)
			await interaction.reply({
				ephemeral: true,
				content: "Pronostici inviati correttamente!",
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId(`predictions-${matchDay!.day}-1-1`)
							.setEmoji("✏️")
							.setLabel("Modifica")
							.setStyle(ButtonStyle.Success),
					),
				],
			});
		else
			await interaction.reply({
				ephemeral: true,
				content: `Parte **${part} di ${total}** inviata correttamente! Clicca il pulsante per continuare...`,
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId(
								`predictions-${matchDay!.day}-${part + 1}-${editing ? 1 : 0}`,
							)
							.setEmoji("⏩")
							.setLabel("Continua")
							.setStyle(ButtonStyle.Primary),
					),
				],
			});
	},
	async component(interaction) {
		const matchDay = await MatchDay.findOne({}).sort("-day");

		if (await checkMatchDay(matchDay, interaction)) return;
		const [, day, part, edit] = interaction.customId
			.split("-")
			.map((n) => Number(n));

		if (day !== matchDay!.day) {
			await interaction.reply({
				ephemeral: true,
				content: "Questi pronostici sono scaduti!",
			});
			return;
		}
		await showModal(
			interaction,
			matchDay!,
			part,
			(edit && (await User.findById(interaction.user.id))) || undefined,
			true,
		);
	},
});
