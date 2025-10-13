import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionContextType,
	MessageFlags,
	PermissionFlagsBits,
	Routes,
	TextInputStyle,
	type APIBan,
	type APIGuild,
	type APIGuildMember,
	type APIInteractionDataResolvedGuildMember,
	type APIInteractionGuildMember,
	type APIInteractionResponseCallbackData,
	type APIModalSubmitTextInputComponent,
	type APIUser,
	type InteractionResponseType,
	type ModalSubmitLabelComponent,
	type RESTPatchAPIWebhookWithTokenMessageJSONBody,
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
	type RESTPutAPIGuildBanJSONBody,
	type Snowflake,
} from "discord-api-types/v10";
import {
	Command,
	Emojis,
	escapeMarkdown,
	maxLength,
	normalizeError,
	ok,
	rest,
	TimeUnit,
	type ChatInputArgs,
	type ChatInputReplies,
	type ComponentArgs,
	type ComponentReplies,
	type ModalArgs,
	type ModalReplies,
	type Reply,
} from "../util/index.ts";

export class Bann extends Command {
	static override chatInputData = {
		type: ApplicationCommandType.ChatInput,
		name: "bann",
		description: "Gestisci i bann",
		default_member_permissions: String(PermissionFlagsBits.BanMembers),
		contexts: [InteractionContextType.Guild],
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
	static checkPerms = (
		executor: APIInteractionGuildMember,
		guild: APIGuild,
		target: Snowflake,
		targetMember?: Omit<APIInteractionDataResolvedGuildMember, "permissions">,
	): string | undefined => {
		if (executor.user.id === target)
			return "Non puoi eseguire questa azione su te stesso!";
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
			return "Non puoi eseguire questa azione su un membro con una posizione superiore o uguale alla tua!";
		return undefined;
	};
	async remove(
		{ reply }: ChatInputReplies,
		{
			interaction,
			options,
		}: ChatInputArgs<typeof Bann.chatInputData, "remove">,
	) {
		this.checkPerms(interaction.app_permissions, reply);
		reply(
			await this.unban(
				interaction.guild_id!,
				interaction.data.resolved!.users![options.user]!,
				options.reason,
			),
		);
	}
	async add(
		{ reply, defer }: ChatInputReplies,
		{ interaction, options }: ChatInputArgs<typeof Bann.chatInputData, "add">,
	) {
		this.checkPerms(interaction.app_permissions, reply);
		ok(
			interaction.guild_id &&
				interaction.member &&
				interaction.data.resolved?.users,
		);
		const content = Bann.checkPerms(
			interaction.member,
			(await rest.get(Routes.guild(interaction.guild_id))) as APIGuild,
			options.user,
			interaction.data.resolved.members?.[options.user],
		);

		if (content) return reply({ content, flags: MessageFlags.Ephemeral });
		defer();
		await rest.patch(
			Routes.webhookMessage(interaction.application_id, interaction.token),
			{
				body: (await this.executeBan(
					interaction.guild_id,
					interaction.data.resolved.users[options.user]!,
					options["delete-messages"] &&
						Number(options["delete-messages"]) *
							(TimeUnit.Day / TimeUnit.Second),
					options.reason,
				)) satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
			},
		);
	}
	async check(
		{ reply }: ChatInputReplies,
		{ interaction, options }: ChatInputArgs<typeof Bann.chatInputData, "check">,
	) {
		this.checkPerms(interaction.app_permissions, reply);
		const user = interaction.data.resolved?.users?.[options.user];
		const bannData = (await rest
			.get(Routes.guildBan(interaction.guild_id!, options.user))
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
						content: `<@${options.user}> (${escapeMarkdown(user?.username ?? "Unknown user")} - ${options.user}) non è bannato dal server!`,
						allowed_mentions: { parse: [] },
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
	override async component(
		{ reply, modal, defer }: ComponentReplies,
		{ interaction, args: [id, action] }: ComponentArgs,
	) {
		ok(interaction.guild_id && interaction.member);
		this.checkPerms(interaction.member.permissions, reply, false);
		const target = (await rest.get(Routes.user(id))) as APIUser | undefined;

		if (!target)
			return reply({
				content: "Utente non trovato!",
				flags: MessageFlags.Ephemeral,
			});
		if (action === "a")
			return modal({
				title: `Bannare ${target.username}?`,
				custom_id: `bann-${target.id}`,
				components: [
					{
						type: ComponentType.Label,
						label: "Giorni da eliminare",
						description: "Il numero di giorni di messaggi da eliminare",
						component: {
							type: ComponentType.TextInput,
							custom_id: "deleteMessageDays",
							placeholder: "Esempi: 1, 3.5, 7",
							style: TextInputStyle.Short,
							value: "1",
							min_length: 1,
							max_length: 10,
							required: false,
						},
					},
					{
						type: ComponentType.Label,
						label: "Motivo del bann",
						description: "Il motivo del bann da salvare nei log",
						component: {
							type: ComponentType.TextInput,
							custom_id: "reason",
							placeholder: "Scrivi il motivo del bann qui...",
							max_length: 512,
							style: TextInputStyle.Paragraph,
							required: false,
						},
					},
				],
			});
		if (action === "r") {
			defer();
			const [guild, targetMember] = (await Promise.allSettled([
				rest.get(Routes.guild(interaction.guild_id)),
				rest.get(Routes.guildMember(interaction.guild_id, id)),
			]).then((results) =>
				results.map((r) => (r.status === "fulfilled" ? r.value : undefined)),
			)) as [APIGuild | undefined, APIGuildMember | undefined];
			const fullRoute = Routes.webhookMessage(
				interaction.application_id,
				interaction.token,
			);

			ok(guild);
			const content = Bann.checkPerms(
				interaction.member,
				guild,
				target.id,
				targetMember,
			);
			if (content)
				return rest.patch(fullRoute, {
					body: {
						content,
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				});
			return rest.patch(fullRoute, {
				body: (await this.unban(
					interaction.guild_id,
					target,
				)) satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
			});
		}
		return;
	}
	override async modal(
		{ reply }: ModalReplies,
		{ interaction, args: [id] }: ModalArgs,
	) {
		ok(interaction.guild_id && interaction.member);
		this.checkPerms(interaction.member.permissions, reply, false);
		const deleteMessageDays =
			Number(
				interaction.data.components.find(
					(
						v,
					): v is ModalSubmitLabelComponent & {
						component: APIModalSubmitTextInputComponent;
					} =>
						v.type === ComponentType.Label &&
						v.component.type === ComponentType.TextInput &&
						v.component.custom_id === "deleteMessageDays",
				)?.component.value,
			) || 0;

		if (deleteMessageDays < 0 || deleteMessageDays > 7)
			return reply({
				content: "Il numero di giorni deve essere compreso tra 0 e 7!",
				flags: MessageFlags.Ephemeral,
			});
		reply({
			content: `-# Sto bannando <@${id}>...`,
			allowed_mentions: { parse: [] },
		});
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
		const content = Bann.checkPerms(
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
					interaction.data.components.find(
						(
							v,
						): v is ModalSubmitLabelComponent & {
							component: APIModalSubmitTextInputComponent;
						} =>
							v.type === ComponentType.Label &&
							v.component.type === ComponentType.TextInput &&
							v.component.custom_id === "reason",
					)?.component.value,
				)) satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
			},
		);
	}
	unban = async (
		guildId: Snowflake,
		user: APIUser,
		reason?: string,
	): Promise<
		RESTPatchAPIWebhookWithTokenMessageJSONBody &
			APIInteractionResponseCallbackData
	> => {
		reason = reason?.trim();
		const result = await rest
			.delete(Routes.guildBan(guildId, user.id), { reason })
			.then(() => {})
			.catch(normalizeError);

		if (result?.message === "Unknown Ban")
			return {
				content: `<@${user.id}> (${escapeMarkdown(user.username)} - ${user.id}) non è bannato dal server!`,
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
		if (result)
			return {
				content: `Si è verificato un errore: \`${maxLength(result.message, 1000)}\``,
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
	};
	executeBan = async (
		guildId: Snowflake,
		user: APIUser,
		deleteMessageSeconds?: number,
		reason?: string,
	): Promise<RESTPatchAPIWebhookWithTokenMessageJSONBody> => {
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
	};
	checkPerms = (
		permissions: string,
		reply: Reply<InteractionResponseType.ChannelMessageWithSource>,
		app = true,
	) => {
		if (BigInt(permissions) & PermissionFlagsBits.BanMembers) return;
		throw reply({
			content: `${app ? "Ho" : "Hai"} bisogno del permesso "Bannare i membri" per poter eseguire questo comando!`,
			flags: MessageFlags.Ephemeral,
		});
	};
}
