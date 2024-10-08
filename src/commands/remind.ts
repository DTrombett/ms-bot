import {
	EmbedBuilder,
	quote,
	time,
	TimestampStyles,
} from "@discordjs/builders";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	MessageFlags,
	type APIApplicationCommandInteractionDataOption,
	type APIApplicationCommandInteractionDataStringOption,
	type APIApplicationCommandInteractionDataSubcommandOption,
} from "discord-api-types/v10";
import ms from "ms";
import { Reminder, type CommandOptions } from "../util";

export const remind: CommandOptions<ApplicationCommandType.ChatInput> = {
	data: [
		{
			name: "remind",
			description: "Imposta un promemoria o gestisci quelli esistenti",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "me",
					description: "Imposta un promemoria",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "to",
							description: "Il promemoria da impostare (es. Fare la spesa)",
							type: ApplicationCommandOptionType.String,
							required: true,
							max_length: 1000,
						},
						{
							name: "in",
							description: "Tra quanto tempo te lo dovrò ricordare (es. 1d3h)",
							type: ApplicationCommandOptionType.String,
							required: true,
							max_length: 1024,
						},
					],
				},
				{
					name: "list",
					description: "Elenca i tuoi promemoria",
					type: ApplicationCommandOptionType.Subcommand,
				},
			],
		},
	],
	run: async (reply, { interaction, env }) => {
		const options = new Map<
			string,
			APIApplicationCommandInteractionDataOption
		>();
		const [subcommand] = interaction.data
			.options as APIApplicationCommandInteractionDataSubcommandOption[];

		for (const option of subcommand!.options!) options.set(option.name, option);
		if (subcommand?.name === "me") {
			const { value: reminder } = options.get(
				"to",
			) as APIApplicationCommandInteractionDataStringOption;
			const { value: date } = options.get(
				"in",
			) as APIApplicationCommandInteractionDataStringOption;
			const seconds = ms(date.replace(/\s+/g, "")) / 1_000 || 0;

			if (seconds > 315_360_000) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: "Non puoi impostare una durata maggiore di 10 anni!",
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			if (seconds < 10) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: "Non puoi impostare una durata minore di 10 secondi!",
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			if (
				((await env.DB.prepare(
					`SELECT COUNT(*) as count
						FROM Reminders
						WHERE userId = ?1`,
				)
					.bind((interaction.member ?? interaction).user?.id)
					.first<number>("count")) ?? 0) >= 10
			) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: "Non puoi impostare più di 10 promemoria al momento :(",
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			if (
				await env.DB.prepare(
					`INSERT INTO Reminders (date, userId, remind)
				VALUES (datetime('now', '+' || ?1 || ' seconds'), ?2, ?3)`,
				)
					.bind(seconds, (interaction.member ?? interaction).user?.id, reminder)
					.run()
					.catch(() => {})
			)
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: "Promemoria impostato correttamente!",
						flags: MessageFlags.Ephemeral,
					},
				});
			else
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: "Questo promemoria già esiste!",
						flags: MessageFlags.Ephemeral,
					},
				});
		} else if (subcommand?.name === "list") {
			const { results } = await env.DB.prepare(
				`SELECT date,
					remind
				FROM Reminders
				WHERE userId = ?1
				ORDER BY date ASC`,
			)
				.bind((interaction.member ?? interaction).user?.id)
				.all<Pick<Reminder, "date" | "remind">>();

			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					embeds: results.length
						? [
								new EmbedBuilder()
									.setTitle("⏰ Promemoria")
									.setColor(0x5865f2)
									.setDescription(
										results
											.map((r, i) => {
												const date = new Date(`${r.date.replace(" ", "T")}Z`);

												return `${i + 1}. ${time(date, TimestampStyles.LongDateTime)} (${time(date, TimestampStyles.RelativeTime)})\n${r.remind.slice(0, 256).split("\n").map(quote).join("\n")}`;
											})
											.join("\n"),
									)
									.toJSON(),
							]
						: undefined,
					content: results.length
						? undefined
						: "Non hai impostato alcun promemoria!",
					flags: MessageFlags.Ephemeral,
				},
			});
		} else if (subcommand?.name === "remove") {
			const { results } = await env.DB.prepare(
				`SELECT date,
					remind
				FROM Reminders
				WHERE userId = ?1
				ORDER BY date ASC`,
			)
				.bind((interaction.member ?? interaction).user?.id)
				.all<Pick<Reminder, "date" | "remind">>();

			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					embeds: results.length
						? [
								new EmbedBuilder()
									.setTitle("⏰ Promemoria")
									.setColor(0x5865f2)
									.setDescription(
										results
											.map((r, i) => {
												const date = new Date(`${r.date.replace(" ", "T")}Z`);

												return `${i + 1}. ${time(date, TimestampStyles.LongDateTime)} (${time(date, TimestampStyles.RelativeTime)})\n${r.remind.slice(0, 256).split("\n").map(quote).join("\n")}`;
											})
											.join("\n"),
									)
									.toJSON(),
							]
						: undefined,
					content: results.length
						? undefined
						: "Non hai impostato alcun promemoria!",
					flags: MessageFlags.Ephemeral,
				},
			});
		}
	},
};
