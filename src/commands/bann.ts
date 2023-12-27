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
	APIInteractionDataResolvedGuildMember,
	APIInteractionGuildMember,
	APIInteractionResponseCallbackData,
	APIInteractionResponseChannelMessageWithSource,
	APIUser,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionResponseType,
	MessageFlags,
	PermissionFlagsBits,
	RESTPutAPIGuildBanJSONBody,
	Routes,
	Snowflake,
} from "discord-api-types/v10";
import { Emojis, createCommand, normalizeError } from "../util";

const checkPerms = (
	executor: APIInteractionGuildMember,
	guild: APIGuild,
	target: Snowflake,
	targetMember?: APIInteractionDataResolvedGuildMember,
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
): Promise<APIInteractionResponseChannelMessageWithSource> => {
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
			type: InteractionResponseType.ChannelMessageWithSource,
			data: {
				content: `Si è verificato un errore: \`${result.message.slice(
					0,
					1000,
				)}\``,
				flags: MessageFlags.Ephemeral,
			},
		};
	return {
		type: InteractionResponseType.ChannelMessageWithSource,
		data: {
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
		},
	};
};
const unban = async (
	api: REST,
	guildId: Snowflake,
	user: APIUser,
	reason?: string,
) => {
	reason = reason?.trim();
	const result = await api
		.delete(Routes.guildBan(guildId, user.id), { reason })
		.then(() => {})
		.catch(normalizeError);

	if (result)
		return {
			type: InteractionResponseType.ChannelMessageWithSource,
			data: {
				content: `Si è verificato un errore: \`${result.message.slice(
					0,
					1000,
				)}\``,
				flags: MessageFlags.Ephemeral,
			},
		};
	return {
		type: InteractionResponseType.ChannelMessageWithSource,
		data: {
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
		},
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
	async run({ interaction }, resolve, reject) {
		if (
			!(BigInt(interaction.app_permissions) & PermissionFlagsBits.BanMembers)
		) {
			resolve({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content:
						'Ho bisogno del permesso "Bannare i membri" per eseguire questo comando!',
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		if (!interaction.guild_id) {
			resolve({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "Questo comando può essere eseguito solo in un server!",
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		if (!interaction.data.options || !interaction.member) {
			reject();
			return;
		}
		const options = new Map<
			string,
			APIApplicationCommandInteractionDataOption
		>();
		let subcommand!: APIApplicationCommandInteractionDataSubcommandOption;

		for (const option of interaction.data.options) {
			options.set(option.name, option);
			if (option.type === ApplicationCommandOptionType.Subcommand)
				subcommand = option;
		}
		const { value: userId } = options.get(
			"user",
		) as APIApplicationCommandInteractionDataUserOption;
		const user = interaction.data.resolved!.users![userId]!;

		if (subcommand.name === "check") {
			const bannData = (await this.api
				.get(Routes.guildBan(interaction.guild_id, userId))
				.catch(() => undefined)) as APIBan | undefined;

			if (!bannData) {
				resolve({
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
			resolve({
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

		if (checkPerms(interaction.member, guild, user.id, member)) return;
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

		if (subcommand.name === "add")
			await executeBan(
				this.api,
				interaction.guild_id,
				user,
				deleteMessageDays && deleteMessageDays * 60 * 60 * 24,
				reason ?? undefined,
			);
		else if (subcommand.name === "remove")
			await unban(this.api, interaction.guild_id, user, reason ?? undefined);
	},
	async modalSubmit() {
		// if (!interaction.inCachedGuild()) return;
		// const deleteMessageDays =
		// 	Number(interaction.fields.getTextInputValue("deleteMessageDays")) || 0;
		// if (deleteMessageDays < 0 || deleteMessageDays > 7) {
		// 	await interaction.reply({
		// 		content: "Il numero di giorni deve essere compreso tra 0 e 7!",
		// 		ephemeral: true,
		// 	});
		// 	return;
		// }
		// const { guild } = interaction;
		// const [, id] = interaction.customId.split("-");
		// const [user, member] = (await Promise.allSettled([
		// 	this.client.users.fetch(id),
		// 	guild.members.fetch(id),
		// ]).then((results) =>
		// 	results.map((r) => (r.status === "fulfilled" ? r.value : undefined)),
		// )) as [User | undefined, GuildMember | undefined];
		// if (!user) {
		// 	await interaction.reply({
		// 		content: "Utente non trovato!",
		// 		ephemeral: true,
		// 	});
		// 	return;
		// }
		// if (await checkPerms(interaction, guild.ownerId, id, member)) return;
		// await executeBan(
		// 	interaction,
		// 	user,
		// 	deleteMessageDays * 60 * 60 * 24,
		// 	interaction.fields.getTextInputValue("reason"),
		// );
	},
	async component() {
		// if (!interaction.inCachedGuild()) return;
		// const { guild } = interaction;
		// const [, id, action] = interaction.customId.split("-");
		// const [user, member] = (await Promise.allSettled([
		// 	this.client.users.fetch(id),
		// 	guild.members.fetch(id),
		// ]).then((results) =>
		// 	results.map((r) => (r.status === "fulfilled" ? r.value : undefined)),
		// )) as [User | undefined, GuildMember | undefined];
		// if (!user) {
		// 	await interaction.reply({
		// 		content: "Utente non trovato!",
		// 		ephemeral: true,
		// 	});
		// 	return;
		// }
		// if (await checkPerms(interaction, guild.ownerId, id, member)) return;
		// if (action === "a")
		// 	await interaction.showModal({
		// 		title: `Vuoi bannare ${user.username}?`,
		// 		custom_id: `bann-${user.id}`,
		// 		components: [
		// 			{
		// 				type: ComponentType.ActionRow,
		// 				components: [
		// 					{
		// 						type: ComponentType.TextInput,
		// 						custom_id: "deleteMessageDays",
		// 						label: "Giorni di messaggi da eliminare",
		// 						placeholder: "Esempi: 1, 3.5, 7",
		// 						style: TextInputStyle.Short,
		// 						value: "1",
		// 						min_length: 1,
		// 						max_length: 10,
		// 						required: false,
		// 					},
		// 				],
		// 			},
		// 			{
		// 				type: ComponentType.ActionRow,
		// 				components: [
		// 					{
		// 						type: ComponentType.TextInput,
		// 						custom_id: "reason",
		// 						label: "Motivo del bann",
		// 						placeholder: "Il motivo del bann",
		// 						max_length: 512,
		// 						style: TextInputStyle.Paragraph,
		// 						required: false,
		// 					},
		// 				],
		// 			},
		// 		],
		// 	});
		// else if (action === "r") await unban(interaction, user);
	},
});
