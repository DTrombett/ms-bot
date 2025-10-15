import { env } from "cloudflare:workers";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionType,
	MessageFlags,
	Routes,
	type APIChatInputApplicationCommandInteraction,
	type APIComponentInContainer,
	type APIMessageComponentInteraction,
	type RESTPatchAPIWebhookWithTokenMessageJSONBody,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command.ts";
import normalizeError from "../util/normalizeError.ts";
import { rest } from "../util/rest.ts";
import { maxLength } from "../util/strings.ts";
import { parseTime, TimeUnit } from "../util/time.ts";

export class Remind extends Command {
	static override chatInputData = {
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
	} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
	static override customId = "remind";
	static override supportComponentMethods = true;
	static me = async (
		{ reply, defer }: ChatInputReplies,
		{
			options,
			user: { id: userId },
			interaction: { application_id, token },
		}: ChatInputArgs<typeof Remind.chatInputData, "me">,
	) => {
		const duration = parseTime(options.in);
		const fullRoute = Routes.webhookMessage(application_id, token);
		if (duration > TimeUnit.Year)
			return reply({
				content: "Non puoi impostare una durata maggiore di 1 anno!",
				flags: MessageFlags.Ephemeral,
			});
		if (duration < TimeUnit.Second)
			return reply({
				content: "Non puoi impostare una durata minore di 1 secondo!",
				flags: MessageFlags.Ephemeral,
			});
		if (options.to.length > 1_000)
			return reply({
				content: "La lunghezza massima di un promemoria è di 1000 caratteri",
				flags: MessageFlags.Ephemeral,
			});
		defer({ flags: MessageFlags.Ephemeral });
		if (
			((await env.DB.prepare(
				`SELECT COUNT(*) as count
						FROM Reminders
						WHERE userId = ?1`,
			)
				.bind(userId)
				.first<number>("count")) ?? 0) >= 64
		)
			return rest.patch(fullRoute, {
				body: {
					content: "Non puoi impostare più di 64 promemoria!",
				} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
			});
		const id = Math.random().toString(36).slice(2, 10).padEnd(8, "0");
		const result = await env.REMINDER.create({
			id: `${userId}-${id}`,
			params: {
				message: { content: `🔔 Promemoria: ${options.to}` },
				duration,
				userId,
				remind: options.to,
			},
		}).catch(normalizeError);

		if (result instanceof Error)
			return rest.patch(fullRoute, {
				body: {
					content: `Si è verificato un errore: \`${result.message}\``,
				} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
			});
		return rest.patch(fullRoute, {
			body: {
				content: `Promemoria \`${id}\` impostato correttamente!`,
			} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
		});
	};
	static list = (
		{ defer, deferUpdate }: Merge<ChatInputReplies, ComponentReplies>,
		{
			args: [, page] = [],
			user: { id: userId },
			interaction,
		}: Merge<ChatInputArgs<typeof Remind.chatInputData, "list">, ComponentArgs>,
	) => {
		if (interaction.type === InteractionType.MessageComponent) deferUpdate!();
		else defer({ flags: MessageFlags.Ephemeral });
		return this.sendPage(interaction, userId, Number(page) || 0);
	};
	static remove = async (
		{ defer, reply }: ChatInputReplies | ComponentReplies,
		{
			args: [, argId] = [],
			options: { id } = { id: argId! },
			user: { id: userId },
			interaction: { application_id, token },
		}: Merge<
			ChatInputArgs<typeof Remind.chatInputData, "remove">,
			ComponentArgs
		>,
	) => {
		const instance = await env.REMINDER.get(`${userId}-${id}`).catch(() => {});
		if (!instance)
			return reply({
				content: "Promemoria non trovato!",
				flags: MessageFlags.Ephemeral,
			});
		defer({ flags: MessageFlags.Ephemeral });
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
		const fullRoute = Routes.webhookMessage(application_id, token);

		if (error)
			return rest.patch(fullRoute, {
				body: {
					content: `Si è verificato un errore: \`${error.message}\``,
				} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
			});
		return rest.patch(fullRoute, {
			body: {
				content: "Promemoria rimosso correttamente!",
			} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
		});
	};
	static sendPage = async (
		{
			application_id,
			token,
		}: Pick<
			| APIChatInputApplicationCommandInteraction
			| APIMessageComponentInteraction,
			"application_id" | "token"
		>,
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

		return rest.patch(Routes.webhookMessage(application_id, token), {
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
		});
	};
}
