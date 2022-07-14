import type { InteractionType, Snowflake } from "discord-api-types/v10";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ComponentType,
	TextInputStyle,
} from "discord-api-types/v10";
import { escapeMarkdown, GuildMember } from "discord.js";
import type { InteractionByType, ReceivedInteraction } from "../util";
import {
	createCommand,
	CustomClient,
	Emojis,
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
		if (!interaction.memberPermissions.has("KickMembers")) {
			await interaction.reply({
				content:
					"Hai bisogno del permesso **Espelli membri** per eseguire questa azione!",
				ephemeral: true,
			});
			return true;
		}
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
	if (!member.kickable) {
		await interaction.reply({
			content: "Non ho abbastanza permessi per espellere questo membro!",
			ephemeral: true,
		});
		return true;
	}
	return false;
};
const executeKick = async (
	interaction: ReceivedInteraction<"cached">,
	member: GuildMember,
	reason = ""
) => {
	const [error] = await Promise.all([
		member
			.kick(reason || undefined)
			.then(() => undefined)
			.catch(normalizeError),
		interaction.deferReply().catch(CustomClient.printToStderr),
	]);

	if (error) {
		await sendError(interaction, error);
		return;
	}
	await interaction.editReply({
		content: `<:kick:${Emojis.kick}> <@${member.user.id}> (${escapeMarkdown(
			member.user.tag
		)} - ${member.user.id}) è stato espulso!\n\nMotivo: ${
			reason.length ? reason.slice(0, 1_000) : "*Nessun motivo*"
		}`,
	});
};
const showModal = (
	interaction: InteractionByType<
		InteractionType.ApplicationCommand | InteractionType.MessageComponent
	>,
	member: GuildMember
) =>
	interaction.showModal({
		title: `Espelli ${member.user.username} dal server`,
		custom_id: `kick-${member.id}`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.TextInput,
						custom_id: "reason",
						label: "Motivo dell'espulsione",
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

export const command = createCommand({
	data: [
		{
			type: ApplicationCommandType.ChatInput,
			name: "kick",
			description: "Espelli utente",
			options: [
				{
					name: "member",
					description: "Il membro da espellere",
					type: ApplicationCommandOptionType.User,
					required: true,
				},
				{
					name: "reason",
					description: "Il motivo dell'espulsione, se presente",
					type: ApplicationCommandOptionType.String,
				},
			],
		},
		{
			type: ApplicationCommandType.User,
			name: "Espelli",
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
		const option = interaction.options.data.find(
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
		if (interaction.commandName === "Espelli") {
			await showModal(interaction, member!);
			return;
		}
		const reason = interaction.options.data.find(
			(o) => o.name === "reason"
		)?.value;

		await executeKick(
			interaction,
			member!,
			typeof reason === "string" ? reason : undefined
		);
	},
	async modalSubmit(interaction) {
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
		await executeKick(
			interaction,
			member!,
			interaction.fields.fields.get("reason")?.value
		);
	},
});
