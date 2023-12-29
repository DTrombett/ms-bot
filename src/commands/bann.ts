import { escapeMarkdown } from "@discordjs/formatters";
import { REST } from "@discordjs/rest";
import {
	APIApplicationCommandInteractionDataNumberOption,
	APIApplicationCommandInteractionDataOption,
	APIApplicationCommandInteractionDataStringOption,
	APIApplicationCommandInteractionDataSubcommandOption,
	APIApplicationCommandInteractionDataUserOption,
	APIBan,
	APIGuild,
	APIGuildMember,
	APIInteractionDataResolvedGuildMember,
	APIInteractionGuildMember,
	APIInteractionResponseCallbackData,
	APIUser,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionResponseType,
	MessageFlags,
	PermissionFlagsBits,
	RESTPatchAPIWebhookWithTokenMessageJSONBody,
	RESTPutAPIGuildBanJSONBody,
	Routes,
	Snowflake,
	TextInputStyle,
} from "discord-api-types/v10";
import { Emojis, createCommand, normalizeError } from "../util";

const checkPerms = (
	executor: APIInteractionGuildMember,
	guild: APIGuild,
	target: Snowflake,
	targetMember?: Omit<APIInteractionDataResolvedGuildMember, "permissions">,
): APIInteractionResponseCallbackData | undefined => {
	if (executor.user.id !== guild.owner_id) {
		if (target === guild.owner_id)
			return {
				content: "Non puoi eseguire questa azione sul proprietario del server!",
				flags: MessageFlags.Ephemeral,
			};
		if (targetMember) {
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

			if (highest) {
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
					return {
						content:
							"Non puoi bannare un membro con una posizione superiore o uguale alla tua!",
						flags: MessageFlags.Ephemeral,
					};
			}
		}
	}
	return undefined;
};
const executeBan = async (
	api: REST,
	guildId: Snowflake,
	user: APIUser,
	deleteMessageSeconds?: number,
	reason?: string,
): Promise<RESTPatchAPIWebhookWithTokenMessageJSONBody> => {
	reason = reason?.trim();
	const result = await api
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
				1000,
			)}\``,
		};
	return {
		content: `<:bann:${Emojis.bann}> <@${user.id}> (${escapeMarkdown(
			user.username,
		)} - ${user.id}) è stato bannato!\n\nMotivo: ${
			reason !== undefined && reason.length > 0
				? reason.slice(0, 1_000)
				: "*Nessun motivo*"
		}`,
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
const unban = async (
	api: REST,
	guildId: Snowflake,
	user: APIUser,
	reason?: string,
): Promise<RESTPatchAPIWebhookWithTokenMessageJSONBody> => {
	reason = reason?.trim();
	const result = await api
		.delete(Routes.guildBan(guildId, user.id), { reason })
		.then(() => {})
		.catch(normalizeError);

	if (result)
		return {
			content: `Si è verificato un errore: \`${result.message.slice(
				0,
				1000,
			)}\``,
		};
	return {
		content: `Ho revocato il bann da <@${user.id}> (${escapeMarkdown(
			user.username,
		)} - ${user.id})!\n\nMotivo: ${
			reason?.slice(0, 1_000) ?? "*Nessun motivo*"
		}`,
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

export const bann = createCommand({
	data: [
		{
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
		},
	],
	async run(interaction, { reply }) {
		if (
			!(BigInt(interaction.app_permissions) & PermissionFlagsBits.BanMembers)
		) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content:
						'Ho bisogno del permesso "Bannare i membri" per eseguire questo comando!',
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		if (
			!(interaction.data.options && interaction.member && interaction.guild_id)
		)
			throw new TypeError("Invalid interaction", { cause: interaction });
		const options = new Map<
			string,
			APIApplicationCommandInteractionDataOption
		>();
		const [subcommand] = interaction.data
			.options as APIApplicationCommandInteractionDataSubcommandOption[];

		for (const option of subcommand!.options!) options.set(option.name, option);
		const { value: userId } = options.get(
			"user",
		) as APIApplicationCommandInteractionDataUserOption;
		const user = interaction.data.resolved!.users![userId]!;

		if (subcommand!.name === "check") {
			const bannData = (await this.api
				.get(Routes.guildBan(interaction.guild_id, userId))
				.catch(() => undefined)) as APIBan | undefined;

			if (!bannData) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: "L'utente non è bannato!",
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
					},
				});
				return;
			}
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: `<@${user.id}> (${escapeMarkdown(user.username)} - ${
						user.id
					}) è bannato dal server!\n\nMotivo: ${
						bannData.reason != null
							? bannData.reason.slice(0, 1_000)
							: "*Nessun motivo*"
					}`,
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
				},
			});
			return;
		}
		const member = interaction.data.resolved!.members?.[userId];
		const guild = (await this.api
			.get(Routes.guild(interaction.guild_id))
			.catch(console.error)) as APIGuild;
		const data = checkPerms(interaction.member, guild, user.id, member);

		if (data) {
			reply({ type: InteractionResponseType.ChannelMessageWithSource, data });
			return;
		}
		const reason = (
			options.get("reason") as
				| APIApplicationCommandInteractionDataStringOption
				| undefined
		)?.value;
		const deleteMessageDays = (
			options.get("delete-messages") as
				| APIApplicationCommandInteractionDataNumberOption
				| undefined
		)?.value;

		reply({ type: InteractionResponseType.DeferredChannelMessageWithSource });
		if (subcommand!.name === "add") {
			await this.api
				.patch(
					Routes.webhookMessage(interaction.application_id, interaction.token),
					{
						body: await executeBan(
							this.api,
							interaction.guild_id,
							user,
							deleteMessageDays && deleteMessageDays * 60 * 60 * 24,
							reason ?? undefined,
						),
					},
				)
				.catch(console.error);
			return;
		}
		if (subcommand!.name === "remove")
			await this.api
				.patch(
					Routes.webhookMessage(interaction.application_id, interaction.token),
					{
						body: await unban(
							this.api,
							interaction.guild_id,
							user,
							reason ?? undefined,
						),
					},
				)
				.catch(console.error);
	},
	async modalSubmit(interaction, { reply }) {
		if (!interaction.guild_id || !interaction.member)
			throw new TypeError("Invalid interaction", { cause: interaction });
		const deleteMessageDays =
			Number(
				interaction.data.components[0]?.components.find(
					(v) => v.custom_id === "deleteMessageDays",
				)?.value,
			) || 0;
		if (deleteMessageDays < 0 || deleteMessageDays > 7) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "Il numero di giorni deve essere compreso tra 0 e 7!",
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		const [, id] = interaction.data.custom_id.split("-");
		const [guild, target, targetMember] = (await Promise.allSettled([
			this.api.get(Routes.guild(interaction.guild_id)),
			this.api.get(Routes.user(id)),
			this.api.get(Routes.guildMember(interaction.guild_id, id)),
		]).then((results) =>
			results.map((r) => (r.status === "fulfilled" ? r.value : undefined)),
		)) as [
			APIGuild | undefined,
			APIUser | undefined,
			APIGuildMember | undefined,
		];

		if (!guild) throw new TypeError("Guild not found", { cause: interaction });
		if (!target) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "Utente non trovato!",
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		const data = checkPerms(interaction.member, guild, target.id, targetMember);

		if (data) {
			reply({ type: InteractionResponseType.ChannelMessageWithSource, data });
			return;
		}
		reply({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: await executeBan(
				this.api,
				interaction.guild_id,
				target,
				deleteMessageDays * 60 * 60 * 24,
				interaction.data.components[0]?.components.find(
					(v) => v.custom_id === "reason",
				)?.value,
			),
		});
	},
	async component(interaction, { reply }) {
		if (!interaction.guild_id || !interaction.member)
			throw new TypeError("Invalid interaction", { cause: interaction });
		const [, id, action] = interaction.data.custom_id.split("-");
		const [guild, target, targetMember] = (await Promise.allSettled([
			this.api.get(Routes.guild(interaction.guild_id)),
			this.api.get(Routes.user(id)),
			this.api.get(Routes.guildMember(interaction.guild_id, id)),
		]).then((results) =>
			results.map((r) => (r.status === "fulfilled" ? r.value : undefined)),
		)) as [
			APIGuild | undefined,
			APIUser | undefined,
			APIGuildMember | undefined,
		];

		if (!guild) throw new TypeError("Guild not found", { cause: interaction });
		if (!target) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "Utente non trovato!",
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		const data = checkPerms(interaction.member, guild, target.id, targetMember);

		if (data) {
			reply({ type: InteractionResponseType.ChannelMessageWithSource, data });
			return;
		}
		if (action === "a") {
			reply({
				type: InteractionResponseType.Modal,
				data: {
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
				},
			});
			return;
		}
		if (action === "r")
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: await unban(this.api, interaction.guild_id, target),
			});
	},
});
