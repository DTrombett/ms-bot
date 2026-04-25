import { env, waitUntil } from "cloudflare:workers";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionType,
	MessageFlags,
	type APIComponentInContainer,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import { Temporal } from "temporal-polyfill";
import Command from "../Command";
import normalizeError from "../util/normalizeError";
import { maxLength } from "../util/strings";
import { idToTimestamp, parseDuration } from "../util/time";

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
						max_length: 1000,
					},
					{
						name: "tz",
						description: "Il fuso orario (default Europe/Rome)",
						type: ApplicationCommandOptionType.String,
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
		{ reply, defer, edit }: ChatInputReplies,
		{
			options,
			user: { id: userId },
			interaction: { id: interactionId },
		}: ChatInputArgs<typeof Remind.chatInputData, "me">,
	) => {
		let start;
		try {
			start = Temporal.Instant.fromEpochMilliseconds(
				idToTimestamp(interactionId),
			).toZonedDateTimeISO(options.tz ?? "Europe/Rome");
		} catch (err) {
			return reply({
				content: "Il fuso orario inserito non è valido!",
				flags: MessageFlags.Ephemeral,
			});
		}
		const target = parseDuration(options.in, start);
		if (!target)
			return reply({
				content: "La durata inserita non è valida!",
				flags: MessageFlags.Ephemeral,
			});
		if (Temporal.ZonedDateTime.compare(target, start.add({ seconds: 5 })) <= 0)
			return reply({
				content: `La durata inserita è troppo breve (<t:${Math.round(target.epochMilliseconds / 1000)}:R>)!`,
				flags: MessageFlags.Ephemeral,
			});
		if (Temporal.ZonedDateTime.compare(target, start.add({ years: 4 })) > 0)
			return reply({
				content: `La durata inserita è troppo lunga (<t:${Math.round(target.epochMilliseconds / 1000)}:R>)!`,
				flags: MessageFlags.Ephemeral,
			});
		defer({ flags: MessageFlags.Ephemeral });
		if (
			((await env.DB.prepare(
				`SELECT COUNT(*) as count FROM Reminders WHERE userId = ?1`,
			)
				.bind(userId)
				.first<number>("count")) ?? 0) >= 64
		)
			return edit({ content: "Non puoi impostare più di 64 promemoria!" });
		const id = Math.random().toString(36).slice(2, 10).padEnd(8, "0");
		const result = await env.REMINDER.create({
			id: `${userId}-${id}`,
			params: {
				message: { content: `🔔 Promemoria: ${options.to}` },
				timestamp: target.epochMilliseconds,
				userId,
				remind: options.to,
			},
		}).catch(normalizeError);

		if (result instanceof Error)
			return edit({
				content: `Si è verificato un errore: \`${result.message}\``,
			});
		return edit({
			content: `Promemoria \`${id}\` impostato correttamente <t:${Math.round(target.epochMilliseconds / 1000)}:R>!`,
		});
	};
	static list = (
		{ defer, deferUpdate, edit }: Merge<ChatInputReplies, ComponentReplies>,
		{
			args: [, page] = [],
			user: { id: userId },
			interaction,
		}: Merge<ChatInputArgs<typeof Remind.chatInputData, "list">, ComponentArgs>,
	) => {
		if (interaction.type === InteractionType.MessageComponent) deferUpdate!();
		else defer({ flags: MessageFlags.Ephemeral });
		return this.sendPage(edit, userId, Number(page) || 0);
	};
	static remove = async (
		{
			defer,
			reply,
			edit,
			deferUpdate,
			followup,
		}: Merge<ChatInputReplies, ComponentReplies>,
		{
			args: [, argId, page] = [],
			options: { id } = { id: argId! },
			user: { id: userId },
			interaction,
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
		if (interaction.type === InteractionType.MessageComponent) deferUpdate!();
		else defer({ flags: MessageFlags.Ephemeral });
		const error = await Promise.all([
			instance.terminate(),
			env.DB.prepare(`DELETE FROM Reminders WHERE id = ?1 AND userId = ?2`)
				.bind(id, userId)
				.run(),
		])
			.then(() => {})
			.catch(normalizeError);

		if (error)
			return (
				interaction.type === InteractionType.MessageComponent ?
					followup
				:	edit)({
				content: `Si è verificato un errore: \`${error.message}\``,
				flags: MessageFlags.Ephemeral,
			});
		if (interaction.type === InteractionType.MessageComponent)
			waitUntil(this.sendPage(edit, userId, Number(page) || 0));
		return (
			interaction.type === InteractionType.MessageComponent ?
				followup
			:	edit)({
			content: "Promemoria rimosso correttamente!",
			flags: MessageFlags.Ephemeral,
		});
	};
	static sendPage = async (
		edit: ChatInputReplies["edit"],
		userId: string | undefined,
		page = 0,
	) => {
		const { results } = await env.DB.prepare(
			`
				SELECT id, timestamp, remind, COUNT(*) OVER () AS count
				FROM Reminders WHERE userId = ?1 ORDER BY timestamp LIMIT 10 OFFSET ?2
			`,
		)
			.bind(userId, page * 10)
			.run<
				Pick<Database.Reminder, "timestamp" | "id" | "remind"> & {
					count: number;
				}
			>();
		const count = results[0]?.count ?? 0;

		return edit({
			flags: MessageFlags.IsComponentsV2,
			components: [
				{
					type: ComponentType.Container,
					components:
						results.length ?
							[
								{
									type: ComponentType.TextDisplay,
									content: "## ⏰ Promemoria",
								},
								{ type: ComponentType.Separator },
								...results.map((r, i) => {
									const date = Math.round(r.timestamp / 1000);

									return {
										type: ComponentType.Section,
										components: [
											{
												type: ComponentType.TextDisplay,
												content: `${i + 1 + page * 10}. \`${r.id}\` <t:${date}:F> (<t:${date}:R>)\n>>> ${maxLength(
													r.remind,
													148,
												)}`,
											},
										],
										accessory: {
											type: ComponentType.Button,
											label: "Elimina",
											style: ButtonStyle.Danger,
											custom_id: `remind-remove-${userId}-${r.id}-${page}`,
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
											label: `Pagina ${page + 1} di ${Math.ceil(count / 10)}`,
											style: ButtonStyle.Secondary,
											type: ComponentType.Button,
										},
										{
											custom_id: `remind-list-${userId}-${page + 1}`,
											disabled: count <= (page + 1) * 10,
											emoji: { name: "➡️" },
											style: ButtonStyle.Primary,
											type: ComponentType.Button,
										},
									],
								},
							]
						:	[
								{
									type: ComponentType.TextDisplay,
									content: "Non è presente alcun promemoria!",
								},
							],
				},
			],
		});
	};
}
