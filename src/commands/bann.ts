import type { InteractionType, Snowflake } from "discord-api-types/v10";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	PermissionFlagsBits,
	TextInputStyle,
} from "discord-api-types/v10";
import type { User } from "discord.js";
import { escapeMarkdown, GuildMember } from "discord.js";
import type { InteractionByType, ReceivedInteraction } from "../util";
import { createCommand, CustomClient, Emojis, normalizeError, sendError } from "../util";

const checkPerms = async (
	interaction: ReceivedInteraction<"cached">,
	ownerId: Snowflake,
	id?: Snowflake,
	member?: GuildMember
) => {
	if (interaction.user.id !== ownerId) {
		if (id === ownerId) {
			await interaction.reply({
				content: "Non puoi eseguire questa azione sul proprietario del server!",
				ephemeral: true,
			});
			return true;
		}
		if (member && member.roles.highest.comparePositionTo(interaction.member.roles.highest) >= 0) {
			await interaction.reply({
				content: "Non puoi bannare un membro con una posizione superiore o uguale alla tua!",
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
	deleteMessageDays: number,
	reason = ""
) => {
	const [error] = await Promise.all([
		interaction.guild.members
			.ban(user, {
				deleteMessageDays,
				reason: reason || undefined,
			})
			.then(() => undefined)
			.catch(normalizeError),
		interaction.deferReply().catch(CustomClient.printToStderr),
	]);

	if (error) {
		await sendError(interaction, error);
		return;
	}
	await interaction.editReply({
		content: `<:bann:${Emojis.bann}> <@${user.id}> (${escapeMarkdown(user.tag)} - ${
			user.id
		}) è stato bannato!\n\nMotivo: ${reason.length ? reason.slice(0, 1_000) : "*Nessun motivo*"}`,
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
const showModal = (
	interaction: InteractionByType<
		InteractionType.ApplicationCommand | InteractionType.MessageComponent
	>,
	user: User
) =>
	interaction.showModal({
		title: `Vuoi bannare "@${user.username}"?`,
		custom_id: `bann-${user.id}`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.TextInput,
						custom_id: "deleteMessageDays",
						label: "Elimina la cronologia dei messaggi degli ultimi giorni",
						placeholder: "Esempi: 1, 7",
						style: TextInputStyle.Short,
						value: "1",
						min_length: 1,
						max_length: 3,
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
						placeholder:
							"Inserisci un motivo. Sarà visibile solo nel registro attività e non sarà mostrato al membro.",
						max_length: 512,
						style: TextInputStyle.Paragraph,
						required: false,
					},
				],
			},
		],
	});
const unban = async (interaction: ReceivedInteraction<"cached">, user: User, reason = "") => {
	const { guild } = interaction;

	if (!(await guild.bans.fetch(user.id).catch(() => undefined))) {
		await interaction.reply({
			content: "L'utente non è bannato!",
			ephemeral: true,
		});
		return;
	}
	const [error] = await Promise.all([
		guild.members
			.unban(user, reason || undefined)
			.then(() => undefined)
			.catch(normalizeError),
		interaction.deferReply().catch(CustomClient.printToStderr),
	]);

	if (error) {
		await sendError(interaction, error);
		return;
	}
	await interaction.editReply({
		content: `Ho revocato il bann da <@${user.id}> (${escapeMarkdown(user.tag)} - ${
			user.id
		})!\n\nMotivo: ${reason.length ? reason.slice(0, 1_000) : "*Nessun motivo*"}`,
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

export const command = createCommand({
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
							description: "Quanto eliminare della sua cronologia dei messaggi recenti",
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
		{
			type: ApplicationCommandType.User,
			name: "Bann",
			default_member_permissions: String(PermissionFlagsBits.BanMembers),
		},
	],
	async run(interaction) {
		if (!interaction.inCachedGuild()) {
			await interaction.reply({
				content: "Questo comando può essere usato solo all'interno di un server!",
				ephemeral: true,
			});
			return;
		}
		const data =
			interaction.commandType === ApplicationCommandType.User
				? interaction.options.data
				: interaction.options.data[0].options;

		if (!data) {
			await interaction.reply({
				content: "Questo comando non è attualmente disponibile!",
				ephemeral: true,
			});
			return;
		}
		const option = data.find((o) => o.type === ApplicationCommandOptionType.User);
		const user = option?.user;

		if (!user) {
			await interaction.reply({
				content: "Utente non trovato!",
				ephemeral: true,
			});
			return;
		}
		const { guild } = interaction;

		if (interaction.options.data[0].name === "check") {
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
					bannData.reason != null ? bannData.reason.slice(0, 1_000) : "*Nessun motivo*"
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
		if (interaction.commandName === "Bann") {
			await showModal(interaction, user);
			return;
		}
		const reason = data.find((o) => o.name === "reason")?.value;

		if (interaction.options.data[0].name === "add") {
			const deleteMessages = data.find((o) => o.name === "delete-messages")?.value;
			const deleteMessageDays = typeof deleteMessages === "number" ? deleteMessages : 0;

			await executeBan(
				interaction,
				user,
				deleteMessageDays,
				typeof reason === "string" ? reason : undefined
			);
			return;
		}
		if (interaction.options.data[0].name === "remove")
			await unban(interaction, user, typeof reason === "string" ? reason : undefined);
	},
	async modalSubmit(interaction) {
		const deleteMessageDays =
			Number(interaction.fields.fields.get("deleteMessageDays")?.value) || 0;

		if (deleteMessageDays < 0 || deleteMessageDays > 7) {
			await interaction.reply({
				content: "Il numero di giorni deve essere compreso tra 0 e 7!",
				ephemeral: true,
			});
			return;
		}
		const [, id] = interaction.customId.split("-");
		const user = await this.client.users.fetch(id).catch(() => undefined);

		if (!user) {
			await interaction.reply({
				content: "Utente non trovato!",
				ephemeral: true,
			});
			return;
		}
		if (!interaction.inCachedGuild()) {
			await interaction.reply({
				content: "Questo comando può essere usato solo all'interno di un server!",
				ephemeral: true,
			});
			return;
		}
		const { guild } = interaction;
		const member = await guild.members.fetch(id).catch(() => undefined);

		if (await checkPerms(interaction, guild.ownerId, id, member)) return;
		await executeBan(
			interaction,
			user,
			deleteMessageDays,
			interaction.fields.fields.get("reason")?.value
		);
	},
	async component(interaction) {
		if (!interaction.inCachedGuild()) {
			await interaction.reply({
				content: "Questo comando può essere usato solo all'interno di un server!",
				ephemeral: true,
			});
			return;
		}
		const [, id, action] = interaction.customId.split("-");
		const user = await this.client.users.fetch(id).catch(() => undefined);

		if (!user) {
			await interaction.reply({
				content: "Utente non trovato!",
				ephemeral: true,
			});
			return;
		}
		if (!action || !["a", "r"].includes(action)) {
			await interaction.reply({
				content: "Azione non valida!",
				ephemeral: true,
			});
			return;
		}
		const { guild } = interaction;
		const member = await guild.members.fetch(id).catch(() => undefined);

		if (await checkPerms(interaction, guild.ownerId, id, member)) return;
		if (action === "a") {
			await showModal(interaction, user);
			return;
		}
		await unban(interaction, user, undefined);
	},
});
