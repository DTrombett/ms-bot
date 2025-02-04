import {
	EmbedBuilder,
	inlineCode,
	quote,
	time,
	TimestampStyles,
} from "@discordjs/builders";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	MessageFlags,
	Routes,
	type APIApplicationCommandInteractionDataOption,
	type APIApplicationCommandInteractionDataStringOption,
	type APIApplicationCommandInteractionDataSubcommandOption,
	type RESTPatchAPIWebhookWithTokenMessageJSONBody,
} from "discord-api-types/v10";
import ms from "ms";
import { ok } from "node:assert";
import { normalizeError, Reminder, rest, type CommandOptions } from "../util";

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
					name: "remove",
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
		ok(subcommand);
		for (const option of subcommand.options!) options.set(option.name, option);
		if (subcommand.name === "me") {
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
			if (message.length > 1_000) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content:
							"La lunghezza massima di un promemoria è di 1000 caratteri",
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			reply({
				type: InteractionResponseType.DeferredChannelMessageWithSource,
				data: { flags: MessageFlags.Ephemeral },
			});
			if (
				((await env.DB.prepare(
					`SELECT COUNT(*) as count
						FROM Reminders
						WHERE userId = ?1`,
				)
					.bind((interaction.member ?? interaction).user?.id)
					.first<number>("count")) ?? 0) >= 64
			) {
				await rest.patch(
					Routes.webhookMessage(interaction.application_id, interaction.token),
					{
						body: {
							content: "Non puoi impostare più di 64 promemoria!",
						} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
					},
				);
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
			}).catch(normalizeError);

			if (result instanceof Error) {
				await rest.patch(
					Routes.webhookMessage(interaction.application_id, interaction.token),
					{
						body: {
							content: `Si è verificato un errore: ${inlineCode(result.message)}`,
						} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
					},
				);
				return;
			}
			await rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: {
						content: `Promemoria \`${inlineCode(id)}\` impostato correttamente!`,
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
		} else if (subcommand.name === "list") {
			reply({
				type: InteractionResponseType.DeferredChannelMessageWithSource,
				data: { flags: MessageFlags.Ephemeral },
			});
			const { results } = await env.DB.prepare(
				`SELECT id, date, remind
				FROM Reminders
				WHERE userId = ?1
				ORDER BY date
				LIMIT 5`,
			)
				.bind((interaction.user ?? interaction.member?.user)!.id)
				.all<Pick<Reminder, "date" | "id" | "remind">>();

			await rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: {
						embeds: results.length
							? [
									new EmbedBuilder()
										.setTitle("⏰ Promemoria")
										.setColor(0x5865f2)
										.setDescription(
											results
												.map((r, i) => {
													const date = new Date(r.date);

													return `${i + 1}. ${inlineCode(r.id)} ${time(date, TimestampStyles.LongDateTime)} (${time(date, TimestampStyles.RelativeTime)})\n${r.remind.slice(0, 256).split("\n").map(quote).join("\n")}`;
												})
												.join("\n"),
										)
										.toJSON(),
								]
							: undefined,
						content: results.length
							? undefined
							: "Non hai impostato alcun promemoria!",
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
		} else if (subcommand.name === "remove") {
			const { value: id } = options.get(
				"id",
			) as APIApplicationCommandInteractionDataStringOption;
			const userId = (interaction.user ?? interaction.member?.user)!.id;
			const instance = await env.REMINDER.get(`${userId}-${id}`).catch(
				() => {},
			);

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
			reply({
				type: InteractionResponseType.DeferredChannelMessageWithSource,
				data: { flags: MessageFlags.Ephemeral },
			});
			const error = await Promise.all([
				instance.terminate(),
				env.DB.prepare(
					`DELETE FROM Reminders
					WHERE id = ?1 AND userId = ?2`,
				)
					.bind(id, userId)
					.run(),
			])
				.then(() => {})
				.catch(normalizeError);

			if (error) {
				await rest.patch(
					Routes.webhookMessage(interaction.application_id, interaction.token),
					{
						body: {
							content: `Si è verificato un errore: ${inlineCode(error.message)}`,
						} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
					},
				);
				return;
			}
			await rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: {
						content: "Promemoria rimosso correttamente!",
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
		}
	},
};
