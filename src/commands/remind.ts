import { inlineCode } from "@discordjs/formatters";
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
import { normalizeError, type CommandOptions } from "../util";

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
				{
					name: "delete",
					description: "Elimina un promemoria",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "id",
							description: "L'id del promemoria da eliminare",
							type: ApplicationCommandOptionType.String,
							required: true,
							min_length: 8,
							max_length: 8,
						},
					],
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
			const { value: message } = options.get(
				"to",
			) as APIApplicationCommandInteractionDataStringOption;
			const { value: date } = options.get(
				"in",
			) as APIApplicationCommandInteractionDataStringOption;
			const duration = ms(date.replace(/\s+/g, "") as "0") || 0;

			if (duration > 31_536_000_000) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: "Non puoi impostare una durata maggiore di 1 anno!",
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			if (duration < 1_000) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: "Non puoi impostare una durata minore di 1 secondo!",
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			const id = Array.from(
				{ length: 8 },
				() => Math.random().toString(36)[2],
			).join("");
			const userId = (interaction.user ?? interaction.member?.user)!.id;
			const result = await env.REMINDER.create({
				id: `${userId}-${id}`,
				params: { message, duration, userId },
			})
				.then(() => {})
				.catch(normalizeError);

			if (result) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: `Si è verificato un errore: ${inlineCode(result.message)}`,
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: `Promemoria \`${inlineCode(id)}\` impostato correttamente!`,
					flags: MessageFlags.Ephemeral,
				},
			});
		} else if (subcommand?.name === "list") {
			// TODO
			// const { results } = await env.DB.prepare(
			// 	`SELECT date,
			// 		remind
			// 	FROM Reminders
			// 	WHERE userId = ?1
			// 	ORDER BY date ASC`,
			// )
			// 	.bind((interaction.member ?? interaction).user?.id)
			// 	.all<Pick<Reminder, "date" | "remind">>();
			// reply({
			// 	type: InteractionResponseType.ChannelMessageWithSource,
			// 	data: {
			// 		embeds: results.length
			// 			? [
			// 					new EmbedBuilder()
			// 						.setTitle("⏰ Promemoria")
			// 						.setColor(0x5865f2)
			// 						.setDescription(
			// 							results
			// 								.map((r, i) => {
			// 									const date = new Date(`${r.date.replace(" ", "T")}Z`);
			// 									return `${i + 1}. ${time(date, TimestampStyles.LongDateTime)} (${time(date, TimestampStyles.RelativeTime)})\n${r.remind.slice(0, 256).split("\n").map(quote).join("\n")}`;
			// 								})
			// 								.join("\n"),
			// 						)
			// 						.toJSON(),
			// 				]
			// 			: undefined,
			// 		content: results.length
			// 			? undefined
			// 			: "Non hai impostato alcun promemoria!",
			// 		flags: MessageFlags.Ephemeral,
			// 	},
			// });
		} else if (subcommand?.name === "remove") {
			const { value: id } = options.get(
				"id",
			) as APIApplicationCommandInteractionDataStringOption;
			const instance = await env.REMINDER.get(
				`${(interaction.user ?? interaction.member?.user)!.id}-${id}`,
			).catch(() => {});

			if (!instance) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: "Promemoria non trovato!",
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			const error = await instance.terminate().catch(normalizeError);

			if (error) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: `Si è verificato un errore: ${inlineCode(error.message)}`,
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "Promemoria rimosso correttamente!",
					flags: MessageFlags.Ephemeral,
				},
			});
		}
	},
};
