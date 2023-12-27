import type { Snowflake, User } from "discord.js";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	GuildMember,
	PermissionFlagsBits,
	TextInputStyle,
	escapeMarkdown,
} from "discord.js";
import type { ReceivedInteraction } from "../util";
import { Emojis, createCommand, normalizeError, sendError } from "../util";

const checkPerms = async (
	interaction: ReceivedInteraction<"cached">,
	ownerId: Snowflake,
	id?: Snowflake,
	member?: GuildMember,
) => {
	if (interaction.user.id !== ownerId) {
		if (id === ownerId) {
			await interaction.reply({
				content: "Non puoi eseguire questa azione sul proprietario del server!",
				ephemeral: true,
			});
			return true;
		}
		if (
			member &&
			member.roles.highest.comparePositionTo(
				interaction.member.roles.highest,
			) >= 0
		) {
			await interaction.reply({
				content:
					"Non puoi bannare un membro con una posizione superiore o uguale alla tua!",
				ephemeral: true,
			});
			return true;
		}
	}
	if (member?.bannable === false) {
		await interaction.reply({
			content: "Non ho abbastanza permessi per bannare questo membro!",
			ephemeral: true,
		});
		return true;
	}
	return false;
};
const executeBan = async (
	interaction: ReceivedInteraction<"cached">,
	user: User,
	deleteMessageSeconds?: number,
	reason?: string,
) => {
	reason = reason?.trim();
	const error = await interaction.guild.members
		.ban(user, {
			deleteMessageSeconds,
			reason,
		})
		.then(() => {})
		.catch(normalizeError);

	if (error) {
		await sendError(interaction, error);
		return;
	}
	await interaction.reply({
		content: `<:bann:${Emojis.bann}> <@${user.id}> (${escapeMarkdown(
			user.tag,
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
	});
};
const unban = async (
	interaction: ReceivedInteraction<"cached">,
	user: User,
	reason?: string,
) => {
	const { guild } = interaction;

	if (!(await guild.bans.fetch(user.id).catch(() => undefined))) {
		await interaction.reply({
			content: "L'utente non è bannato!",
			ephemeral: true,
		});
		return;
	}
	const error = await guild.members
		.unban(user, reason)
		.then(() => undefined)
		.catch(normalizeError);

	if (error) {
		await sendError(interaction, error);
		return;
	}
	await interaction.reply({
		content: `Ho revocato il bann da <@${user.id}> (${escapeMarkdown(
			user.tag,
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
	});
};

export const bannCommand = createCommand({
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
	async run(interaction) {
		if (!interaction.inCachedGuild()) return;
		const option = interaction.options.get("user", true);
		const { user } = option;

		if (!user) {
			await interaction.reply({
				content: "Utente non trovato!",
				ephemeral: true,
			});
			return;
		}
		const { guild } = interaction;
		const subcommand = interaction.options.getSubcommand();

		if (subcommand === "check") {
			const bannData = await guild.bans.fetch(user.id).catch(() => undefined);

			if (!bannData) {
				await interaction.reply({
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
				});
				return;
			}
			await interaction.reply({
				content: `<@${user.id}> (${escapeMarkdown(user.tag)} - ${
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
			});
			return;
		}
		const member =
			option.member instanceof GuildMember
				? option.member
				: await guild.members.fetch(user.id).catch(() => undefined);

		if (await checkPerms(interaction, guild.ownerId, user.id, member)) return;
		const reason = interaction.options.getString("reason");
		const deleteMessageDays = interaction.options.getNumber("delete-messages");

		if (subcommand === "add")
			await executeBan(
				interaction,
				user,
				deleteMessageDays == null
					? undefined
					: deleteMessageDays * 60 * 60 * 24,
				reason ?? undefined,
			);
		else if (subcommand === "remove")
			await unban(interaction, user, reason ?? undefined);
	},
	async modalSubmit(interaction) {
		if (!interaction.inCachedGuild()) return;
		const deleteMessageDays =
			Number(interaction.fields.getTextInputValue("deleteMessageDays")) || 0;

		if (deleteMessageDays < 0 || deleteMessageDays > 7) {
			await interaction.reply({
				content: "Il numero di giorni deve essere compreso tra 0 e 7!",
				ephemeral: true,
			});
			return;
		}
		const { guild } = interaction;
		const [, id] = interaction.customId.split("-");
		const [user, member] = (await Promise.allSettled([
			this.client.users.fetch(id),
			guild.members.fetch(id),
		]).then((results) =>
			results.map((r) => (r.status === "fulfilled" ? r.value : undefined)),
		)) as [User | undefined, GuildMember | undefined];

		if (!user) {
			await interaction.reply({
				content: "Utente non trovato!",
				ephemeral: true,
			});
			return;
		}
		if (await checkPerms(interaction, guild.ownerId, id, member)) return;
		await executeBan(
			interaction,
			user,
			deleteMessageDays * 60 * 60 * 24,
			interaction.fields.getTextInputValue("reason"),
		);
	},
	async component(interaction) {
		if (!interaction.inCachedGuild()) return;
		const { guild } = interaction;
		const [, id, action] = interaction.customId.split("-");
		const [user, member] = (await Promise.allSettled([
			this.client.users.fetch(id),
			guild.members.fetch(id),
		]).then((results) =>
			results.map((r) => (r.status === "fulfilled" ? r.value : undefined)),
		)) as [User | undefined, GuildMember | undefined];

		if (!user) {
			await interaction.reply({
				content: "Utente non trovato!",
				ephemeral: true,
			});
			return;
		}
		if (await checkPerms(interaction, guild.ownerId, id, member)) return;
		if (action === "a")
			await interaction.showModal({
				title: `Vuoi bannare ${user.username}?`,
				custom_id: `bann-${user.id}`,
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
		else if (action === "r") await unban(interaction, user);
	},
});
