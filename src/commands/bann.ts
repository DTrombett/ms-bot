import {
	APIBan,
	APIGuild,
	APIGuildMember,
	APIInteractionDataResolvedGuildMember,
	APIInteractionGuildMember,
	APIUser,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	ModalSubmitActionRowComponent,
	PermissionFlagsBits,
	RESTPatchAPIWebhookWithTokenMessageJSONBody,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
	RESTPutAPIGuildBanJSONBody,
	Routes,
	Snowflake,
	TextInputStyle,
} from "discord-api-types/v10";
import {
	ChatInputArgs,
	ChatInputReplies,
	Command,
	ComponentArgs,
	ComponentReplies,
	Emojis,
	escapeMarkdown,
	maxLength,
	ModalArgs,
	ModalReplies,
	normalizeError,
	ok,
	rest,
} from "../util";

export class Bann extends Command {
	static override chatInputData = {
		type: ApplicationCommandType.ChatInput,
		name: "bann",
		description: "Banna utente o revoca un bann",
		default_member_permissions: String(PermissionFlagsBits.BanMembers),
		options: [
			{
				name: "add",
				description: "Banna utente",
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: "user",
						description: "L'utente da bannare",
						type: ApplicationCommandOptionType.User,
						required: true,
					},
					{
						name: "delete-messages",
						description:
							"Quanto eliminare della sua cronologia dei messaggi recenti",
						type: ApplicationCommandOptionType.Number,
						min_value: 0,
						max_value: 7,
					},
					{
						name: "reason",
						description: "Il motivo del bann, se presente",
						type: ApplicationCommandOptionType.String,
						max_length: 512,
					},
				],
			},
			{
				name: "remove",
				description: "Revoca bann",
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: "user",
						description: "L'utente da cui revocare il bann",
						type: ApplicationCommandOptionType.User,
						required: true,
					},
					{
						name: "reason",
						description: "Il motivo della revoca del bann, se presente",
						type: ApplicationCommandOptionType.String,
						max_length: 512,
					},
				],
			},
			{
				name: "check",
				description: "Controlla se un utente è bannato",
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: "user",
						description: "L'utente da controllare",
						type: ApplicationCommandOptionType.User,
						required: true,
					},
				],
			},
		],
	} as const satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;
	static override customId = "bann";
	override async chatInput(
		{ reply, defer }: ChatInputReplies,
		{
			interaction,
			subcommand,
			options,
		}: ChatInputArgs<typeof Bann.chatInputData>,
	) {
		if (!(BigInt(interaction.app_permissions) & PermissionFlagsBits.BanMembers))
			return reply({
				content:
					'Ho bisogno del permesso "Bannare i membri" per poter eseguire questo comando!',
				flags: MessageFlags.Ephemeral,
			});
		const user = interaction.data.resolved?.users?.[options.user];
		ok(interaction.guild_id && interaction.member);
		if (subcommand === "check") {
			const bannData = (await rest
				.get(Routes.guildBan(interaction.guild_id, options.user))
				.catch(() => {})) as APIBan | undefined;

			return reply(
				bannData
					? {
							content: `<@${options.user}> (${escapeMarkdown(user?.username ?? "Unknown user")} - ${
								options.user
							}) è bannato dal server!\n\nMotivo: ${
								bannData.reason
									? maxLength(bannData.reason, 500)
									: "*Nessun motivo*"
							}`,
							allowed_mentions: { parse: [] },
							components: [
								{
									type: ComponentType.ActionRow,
									components: [
										{
											type: ComponentType.Button,
											custom_id: `bann-${options.user}-r`,
											style: ButtonStyle.Danger,
											label: "Revoca bann",
										},
									],
								},
							],
						}
					: {
							content: "L'utente non è bannato!",
							components: [
								{
									type: ComponentType.ActionRow,
									components: [
										{
											type: ComponentType.Button,
											custom_id: `bann-${options.user}-a`,
											label: "Bann",
											style: ButtonStyle.Success,
											emoji: {
												animated: false,
												id: Emojis.bann,
												name: "bann",
											},
										},
									],
								},
							],
						},
			);
		}
		const member = interaction.data.resolved?.members?.[options.user];
		const guild = (await rest.get(
			Routes.guild(interaction.guild_id),
		)) as APIGuild;
		const content = this.checkPerms(
			interaction.member,
			guild,
			options.user,
			member,
		);

		if (content) return reply({ content, flags: MessageFlags.Ephemeral });
		defer();
		if (subcommand === "add")
			return rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: (await this.executeBan(
						interaction.guild_id,
						user!,
						options["delete-messages"] &&
							Number(options["delete-messages"]) * 60 * 60 * 24,
						options.reason,
					)) satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
		if (subcommand === "remove")
			return rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: (await this.unban(
						interaction.guild_id,
						user!,
						options.reason,
					)) satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
		return;
	}
	override async component(
		{ reply, modal, defer }: ComponentReplies,
		{ interaction, args: [id, action] }: ComponentArgs,
	) {
		ok(interaction.guild_id && interaction.member);
		const target = (await rest.get(Routes.user(id))) as APIUser | undefined;

		if (!target)
			return reply({
				content: "Utente non trovato!",
				flags: MessageFlags.Ephemeral,
			});
		if (action === "a")
			return modal({
				title: `Vuoi bannare ${target.username}?`,
				custom_id: `bann-${target.id}`,
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.TextInput,
								custom_id: "deleteMessageDays",
								label: "Giorni di messaggi da eliminare",
								placeholder: "Esempi: 1, 3.5, 7",
								style: TextInputStyle.Short,
								value: "1",
								min_length: 1,
								max_length: 10,
								required: false,
							},
						],
					},
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.TextInput,
								custom_id: "reason",
								label: "Motivo del bann",
								placeholder: "Il motivo del bann",
								max_length: 512,
								style: TextInputStyle.Paragraph,
								required: false,
							},
						],
					},
				],
			});
		defer();
		const [guild, targetMember] = (await Promise.allSettled([
			rest.get(Routes.guild(interaction.guild_id)),
			rest.get(Routes.guildMember(interaction.guild_id, id)),
		]).then((results) =>
			results.map((r) => (r.status === "fulfilled" ? r.value : undefined)),
		)) as [APIGuild | undefined, APIGuildMember | undefined];

		ok(guild);
		const content = this.checkPerms(
			interaction.member,
			guild,
			target.id,
			targetMember,
		);

		if (content)
			return rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: {
						content,
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
		if (action === "r")
			return rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: (await this.unban(
						interaction.guild_id,
						target,
					)) satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
		return;
	}
	override async modal(
		{ reply, defer }: ModalReplies,
		{ interaction, args: [id] }: ModalArgs,
	) {
		ok(interaction.guild_id && interaction.member);
		const deleteMessageDays =
			Number(
				(
					interaction.data.components[0] as ModalSubmitActionRowComponent
				).components.find((v) => v.custom_id === "deleteMessageDays")?.value,
			) || 0;
		if (deleteMessageDays < 0 || deleteMessageDays > 7)
			return reply({
				content: "Il numero di giorni deve essere compreso tra 0 e 7!",
				flags: MessageFlags.Ephemeral,
			});

		defer();
		const [guild, target, targetMember] = (await Promise.allSettled([
			rest.get(Routes.guild(interaction.guild_id)),
			rest.get(Routes.user(id)),
			rest.get(Routes.guildMember(interaction.guild_id, id)),
		]).then((results) =>
			results.map((r) => (r.status === "fulfilled" ? r.value : undefined)),
		)) as [
			APIGuild | undefined,
			APIUser | undefined,
			APIGuildMember | undefined,
		];

		ok(guild);
		if (!target)
			return rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: {
						content: "Utente non trovato!",
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
		const content = this.checkPerms(
			interaction.member,
			guild,
			target.id,
			targetMember,
		);

		if (content)
			return rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: {
						content,
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
		return rest.patch(
			Routes.webhookMessage(interaction.application_id, interaction.token),
			{
				body: (await this.executeBan(
					interaction.guild_id,
					target,
					deleteMessageDays * 60 * 60 * 24,
					(
						interaction.data.components[0] as ModalSubmitActionRowComponent
					).components.find((v) => v.custom_id === "reason")?.value,
				)) satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
			},
		);
	}
	checkPerms(
		executor: APIInteractionGuildMember,
		guild: APIGuild,
		target: Snowflake,
		targetMember?: Omit<APIInteractionDataResolvedGuildMember, "permissions">,
	): string | undefined {
		if (executor.user.id === guild.owner_id) return undefined;
		if (target === guild.owner_id)
			return "Non puoi eseguire questa azione sul proprietario del server!";
		if (!targetMember) return undefined;
		const roles = new Map(guild.roles.map((role) => [role.id, role]));
		const highest = executor.roles.reduce((prev, role, i) => {
			if (i === 0) return prev;
			const resolved = roles.get(role);

			if (!prev) return resolved;
			if (!resolved) return prev;
			if (resolved.position > prev.position) return resolved;
			if (resolved.position < prev.position) return prev;
			if (BigInt(role) < BigInt(prev.id)) return resolved;
			return prev;
		}, roles.get(executor.roles[0]!));

		if (!highest) return undefined;
		const highestId = BigInt(highest.id);

		if (
			targetMember.roles.some((role) => {
				const resolved = roles.get(role);

				return (
					resolved &&
					(resolved.position > highest.position ||
						(resolved.position === highest.position &&
							highestId > BigInt(role)))
				);
			})
		)
			return "Non puoi bannare un membro con una posizione superiore o uguale alla tua!";
		return undefined;
	}
	async unban(
		guildId: Snowflake,
		user: APIUser,
		reason?: string,
	): Promise<RESTPatchAPIWebhookWithTokenMessageJSONBody> {
		reason = reason?.trim();
		const result = await rest
			.delete(Routes.guildBan(guildId, user.id), { reason })
			.then(() => {})
			.catch(normalizeError);

		if (result)
			return {
				content: `Si è verificato un errore: \`${result.message.slice(
					0,
					1_000,
				)}\``,
				allowed_mentions: { parse: [] },
			};
		return {
			content: `Ho revocato il bann da <@${user.id}> (${escapeMarkdown(
				user.username,
			)} - ${user.id})!\n\nMotivo: ${
				reason?.slice(0, 1_000) ?? "*Nessun motivo*"
			}`,
			allowed_mentions: { parse: [] },
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							custom_id: `bann-${user.id}-a`,
							label: "Bann",
							style: ButtonStyle.Success,
							emoji: {
								animated: false,
								id: Emojis.bann,
								name: "bann",
							},
						},
					],
				},
			],
		};
	}
	async executeBan(
		guildId: Snowflake,
		user: APIUser,
		deleteMessageSeconds?: number,
		reason?: string,
	): Promise<RESTPatchAPIWebhookWithTokenMessageJSONBody> {
		reason = reason?.trim();
		const result = await rest
			.put(Routes.guildBan(guildId, user.id), {
				reason,
				body: {
					delete_message_seconds: deleteMessageSeconds,
				} satisfies RESTPutAPIGuildBanJSONBody,
			})
			.then(() => {})
			.catch(normalizeError);

		if (result)
			return {
				content: `Si è verificato un errore: \`${result.message.slice(
					0,
					1_000,
				)}\``,
				allowed_mentions: { parse: [] },
			};
		return {
			content: `<:bann:${Emojis.bann}> <@${user.id}> (${escapeMarkdown(
				user.username,
			)} - ${user.id}) è stato bannato!\n\nMotivo: ${
				reason !== undefined && reason.length > 0
					? reason.slice(0, 1_000)
					: "*Nessun motivo*"
			}`,
			allowed_mentions: { parse: [] },
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							custom_id: `bann-${user.id}-r`,
							style: ButtonStyle.Danger,
							label: "Revoca bann",
						},
					],
				},
			],
		};
	}
}
