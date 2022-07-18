import type { InteractionType, Snowflake } from "discord-api-types/v10";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	PermissionFlagsBits,
	TextInputStyle,
} from "discord-api-types/v10";
import { escapeMarkdown, GuildMember } from "discord.js";
import ms from "ms";
import type { InteractionByType, ReceivedInteraction } from "../util";
import {
	createCommand,
	CustomClient,
	normalizeError,
	sendError,
} from "../util";

const checkPerms = async (
	interaction: ReceivedInteraction<"cached">,
	id: Snowflake,
	ownerId: Snowflake,
	member?: GuildMember
) => {
	if (!member) {
		await interaction.reply({
			content: "L'utente non è nel server!",
			ephemeral: true,
		});
		return true;
	}
	if (interaction.user.id !== ownerId) {
		if (id === ownerId) {
			await interaction.reply({
				content: "Non puoi eseguire questa azione sul proprietario del server!",
				ephemeral: true,
			});
			return true;
		}
		if (
			member.roles.highest.comparePositionTo(
				interaction.member.roles.highest
			) >= 0
		) {
			await interaction.reply({
				content:
					"Non puoi eseguire questa azione su un membro con una posizione superiore o uguale alla tua!",
				ephemeral: true,
			});
			return true;
		}
	}
	if (!member.moderatable) {
		await interaction.reply({
			content: "Non ho abbastanza permessi per moderare questo membro!",
			ephemeral: true,
		});
		return true;
	}
	return false;
};
const executeTimeout = async (
	interaction: ReceivedInteraction,
	member: GuildMember,
	timeout: number,
	reason = ""
) => {
	const [error] = await Promise.all([
		member
			.timeout(timeout, reason || undefined)
			.then(() => undefined)
			.catch(normalizeError),
		interaction.deferReply().catch(CustomClient.printToStderr),
	]);

	if (error) {
		await sendError(interaction, error);
		return;
	}
	const timestamp = Math.round((Date.now() + timeout) / 1000);

	await interaction.editReply({
		content: `Ho applicato il Time out a <@${member.user.id}> (${escapeMarkdown(
			member.user.tag
		)} - ${
			member.user.id
		}) fino a <t:${timestamp}:F> (<t:${timestamp}:R>)!\n\nMotivo: ${
			reason.length ? reason.slice(0, 1_000) : "*Nessun motivo*"
		}`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						custom_id: `timeout-${member.user.id}-r`,
						style: ButtonStyle.Danger,
						label: "Annulla Time out",
					},
				],
			},
		],
	});
};
const validateDuration = async (
	interaction: ReceivedInteraction,
	timeout?: number
) => {
	if (timeout == null || isNaN(timeout) || timeout < 1_000) {
		await interaction.reply({
			content: "La durata non è valida! Esempi: `1m`, `1h`, `1d`.",
			ephemeral: true,
		});
		return true;
	}
	return false;
};
const showModal = (
	interaction: InteractionByType<
		InteractionType.ApplicationCommand | InteractionType.MessageComponent
	>,
	member: GuildMember
) => {
	const { displayName } = member;

	return interaction.showModal({
		title: `Applica Time out a ${
			displayName.length > 26 ? `${displayName.slice(0, 23)}...` : displayName
		}`,
		custom_id: `timeout-${member.id}`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.TextInput,
						custom_id: "duration",
						label: "Durata",
						placeholder: "Esempi: 1h, 1d, 1w",
						required: true,
						style: TextInputStyle.Short,
						value: "1m",
						min_length: 2,
					},
				],
			},
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.TextInput,
						custom_id: "reason",
						label: "Motivo",
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
};
const removeTimeout = async (
	interaction: ReceivedInteraction,
	member: GuildMember,
	reason = ""
) => {
	if (!member.isCommunicationDisabled()) {
		await interaction.reply({
			content: "Il membro non è in Time out!",
			ephemeral: true,
		});
		return;
	}
	const [error] = await Promise.all([
		member
			.timeout(null, reason || undefined)
			.then(() => undefined)
			.catch(normalizeError),
		interaction.deferReply().catch(CustomClient.printToStderr),
	]);

	if (error) {
		await sendError(interaction, error);
		return;
	}
	await interaction.editReply({
		content: `Time out di <@${member.user.id}> (${escapeMarkdown(
			member.user.tag
		)} - ${member.user.id}) annullato!\n\nMotivo: ${
			reason.length ? reason.slice(0, 1_000) : "*Nessun motivo*"
		}`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						custom_id: `timeout-${member.user.id}-a`,
						label: "Applica Time out",
						style: ButtonStyle.Success,
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
			name: "timeout",
			description: "Metti utente in Time out o rimuovilo",
			default_member_permissions: String(PermissionFlagsBits.ModerateMembers),
			options: [
				{
					name: "add",
					description: "Metti utente in Time out",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "user",
							description: "L'utente da mettere in Time out",
							type: ApplicationCommandOptionType.User,
							required: true,
						},
						{
							name: "duration",
							description: "Per quanto tempo sarà messo in Time out",
							type: ApplicationCommandOptionType.String,
							required: true,
						},
						{
							name: "reason",
							description: "Il motivo del Time out, se presente",
							type: ApplicationCommandOptionType.String,
							max_length: 512,
						},
					],
				},
				{
					name: "remove",
					description: "Annulla Time out",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "user",
							description: "L'utente da rimuovere dal Time out",
							type: ApplicationCommandOptionType.User,
							required: true,
						},
						{
							name: "reason",
							description:
								"Il motivo dell'annullamento del Time out, se presente",
							type: ApplicationCommandOptionType.String,
							max_length: 512,
						},
					],
				},
			],
		},
		{
			type: ApplicationCommandType.User,
			name: "Applica Time out",
			default_member_permissions: String(PermissionFlagsBits.ModerateMembers),
		},
	],
	async run(interaction) {
		if (!interaction.inCachedGuild()) {
			await interaction.reply({
				content:
					"Questo comando può essere usato solo all'interno di un server!",
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
		const option = data.find(
			(o) => o.type === ApplicationCommandOptionType.User
		);
		const user = option?.user;

		if (!user) {
			await interaction.reply({
				content: "Utente non trovato!",
				ephemeral: true,
			});
			return;
		}
		const { guild } = interaction;
		const member =
			option.member instanceof GuildMember
				? option.member
				: await guild.members.fetch(user.id).catch(() => undefined);

		if (await checkPerms(interaction, user.id, guild.ownerId, member)) return;
		if (interaction.commandName === "Applica Time out") {
			await showModal(interaction, member!);
			return;
		}
		const reason = data.find((o) => o.name === "reason")?.value;

		if (interaction.options.data[0].name === "add") {
			const duration = data.find((o) => o.name === "duration")?.value;
			const timeout = typeof duration === "string" ? ms(duration) : undefined;

			if (await validateDuration(interaction, timeout)) return;
			await executeTimeout(
				interaction,
				member!,
				timeout!,
				typeof reason === "string" ? reason : undefined
			);
			return;
		}
		await removeTimeout(
			interaction,
			member!,
			typeof reason === "string" ? reason : undefined
		);
	},
	async modalSubmit(interaction) {
		const duration = interaction.fields.fields.get("duration")?.value;
		const timeout = duration === undefined ? undefined : ms(duration);

		if (await validateDuration(interaction, timeout)) return;
		const [, id] = interaction.customId.split("-");

		if (!id) {
			await interaction.reply({
				content: "Utente non trovato!",
				ephemeral: true,
			});
			return;
		}
		if (!interaction.inCachedGuild()) {
			await interaction.reply({
				content:
					"Questo comando può essere usato solo all'interno di un server!",
				ephemeral: true,
			});
			return;
		}
		const { guild } = interaction;
		const member = await guild.members.fetch(id).catch(() => undefined);

		if (await checkPerms(interaction, id, guild.ownerId, member)) return;
		await executeTimeout(
			interaction,
			member!,
			timeout!,
			interaction.fields.fields.get("reason")?.value
		);
	},
	async component(interaction) {
		if (!interaction.inCachedGuild()) {
			await interaction.reply({
				content:
					"Questo comando può essere usato solo all'interno di un server!",
				ephemeral: true,
			});
			return;
		}
		const [, id, action] = interaction.customId.split("-");

		if (!id) {
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

		if (await checkPerms(interaction, id, guild.ownerId, member)) return;
		if (action === "a") {
			await showModal(interaction, member!);
			return;
		}
		await removeTimeout(interaction, member!, undefined);
	},
});
