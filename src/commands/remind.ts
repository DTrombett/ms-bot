import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionResponseType,
	MessageFlags,
	Routes,
	type APIApplicationCommandInteractionDataOption,
	type APIApplicationCommandInteractionDataStringOption,
	type APIApplicationCommandInteractionDataSubcommandOption,
	type APIChatInputApplicationCommandInteraction,
	type APIComponentInContainer,
	type APIMessageComponentInteraction,
	type RESTPatchAPIWebhookWithTokenMessageJSONBody,
} from "discord-api-types/v10";
import {
	maxLength,
	normalizeError,
	ok,
	parseTime,
	Reminder,
	rest,
	type CommandOptions,
	type Env,
} from "../util";

const sendPage = async (
	interaction:
		| APIChatInputApplicationCommandInteraction
		| APIMessageComponentInteraction,
	env: Env,
	userId: string | undefined,
	page = 0,
) => {
	const { results } = await env.DB.prepare(
		`SELECT id, date, remind, COUNT(*) OVER () AS count
				FROM Reminders
				WHERE userId = ?1
				ORDER BY date
				LIMIT 8
				OFFSET ?2`,
	)
		.bind(userId, page * 8)
		.all<Pick<Reminder, "date" | "id" | "remind"> & { count: number }>();
	const count = results[0]?.count ?? 0;

	await rest.patch(
		Routes.webhookMessage(interaction.application_id, interaction.token),
		{
			body: {
				flags: MessageFlags.IsComponentsV2,
				components: [
					{
						type: ComponentType.Container,
						components: results.length
							? [
									{
										type: ComponentType.TextDisplay,
										content: "## ⏰ Promemoria",
									},
									{ type: ComponentType.Separator },
									...results.map((r, i) => {
										const date = Math.round(Date.parse(`${r.date}Z`) / 1000);

										return {
											type: ComponentType.Section,
											components: [
												{
													type: ComponentType.TextDisplay,
													content: `${i + 1 + page * 8}. \`${r.id}\` <t:${date}:F> (<t:${date}:R>)\n>>> ${maxLength(
														r.remind,
														148,
													)}`,
												},
											],
											accessory: {
												type: ComponentType.Button,
												label: "Elimina",
												style: ButtonStyle.Danger,
												custom_id: `remind-remove-${userId}-${r.id}`,
											},
										} satisfies APIComponentInContainer;
									}),
									{
										type: ComponentType.ActionRow,
										components: [
											{
												custom_id: `remind-list-${userId}-${page - 1}`,
												disabled: page <= 0,
												emoji: { name: "⬅️" },
												style: ButtonStyle.Primary,
												type: ComponentType.Button,
											},
											{
												custom_id: `remind-list-${userId}-${page}`,
												disabled: true,
												label: `Pagina ${page + 1} di ${Math.ceil(count / 8)}`,
												style: ButtonStyle.Secondary,
												type: ComponentType.Button,
											},
											{
												custom_id: `remind-list-${userId}-${page + 1}`,
												disabled: count <= (page + 1) * 8,
												emoji: { name: "➡️" },
												style: ButtonStyle.Primary,
												type: ComponentType.Button,
											},
										],
									},
								]
							: [
									{
										type: ComponentType.TextDisplay,
										content: "Non è presente alcun promemoria!",
									},
								],
					},
				],
			} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
		},
	);
};

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
			const duration = parseTime(date);

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
			const userId = (interaction.member ?? interaction).user!.id;

			if (
				((await env.DB.prepare(
					`SELECT COUNT(*) as count
						FROM Reminders
						WHERE userId = ?1`,
				)
					.bind(userId)
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
			const result = await env.REMINDER.create({
				id: `${userId}-${id}`,
				params: {
					message: { content: `🔔 Promemoria: ${message}` },
					duration,
					userId,
					remind: message,
				},
			}).catch(normalizeError);

			if (result instanceof Error) {
				await rest.patch(
					Routes.webhookMessage(interaction.application_id, interaction.token),
					{
						body: {
							content: `Si è verificato un errore: \`${result.message}\``,
						} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
					},
				);
				return;
			}
			await rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: {
						content: `Promemoria \`${id}\` impostato correttamente!`,
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
		} else if (subcommand.name === "list") {
			const userId = (interaction.member ?? interaction).user!.id;

			reply({
				type: InteractionResponseType.DeferredChannelMessageWithSource,
				data: { flags: MessageFlags.Ephemeral },
			});
			await sendPage(interaction, env, userId);
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
							content: `Si è verificato un errore: \`${error.message}\``,
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
	component: async (reply, { interaction, env }) => {
		const [, action, ...args] = interaction.data.custom_id.split("-");

		if (action === "list") {
			reply({ type: InteractionResponseType.DeferredMessageUpdate });
			await sendPage(interaction, env, args[0], Number(args[1]));
			return;
		}
		if (action === "remove") {
			const instance = await env.REMINDER.get(`${args[0]}-${args[1]}`).catch(
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
					.bind(args[1], args[0])
					.run(),
			])
				.then(() => {})
				.catch(normalizeError);

			if (error) {
				await rest.patch(
					Routes.webhookMessage(interaction.application_id, interaction.token),
					{
						body: {
							content: `Si è verificato un errore: \`${error.message}\``,
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
