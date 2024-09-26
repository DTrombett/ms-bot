import { escapeMarkdown } from "@discordjs/formatters";
import {
	APIApplicationCommandInteractionDataOption,
	APIApplicationCommandInteractionDataStringOption,
	APIApplicationCommandInteractionDataUserOption,
	APIGuild,
	APIInteractionDataResolvedGuildMember,
	APIInteractionGuildMember,
	APIUser,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	MessageFlags,
	PermissionFlagsBits,
	RESTPatchAPIWebhookWithTokenMessageJSONBody,
	Routes,
	Snowflake,
} from "discord-api-types/v10";
import { Command, Emojis, normalizeError, rest } from "../util";

const checkPerms = (
	executor: APIInteractionGuildMember,
	guild: APIGuild,
	target: Snowflake,
	targetMember?: Omit<APIInteractionDataResolvedGuildMember, "permissions">,
): string | undefined => {
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
					(resolved.position === highest.position && highestId > BigInt(role)))
			);
		})
	)
		return "Non puoi espellere un membro con una posizione superiore o uguale alla tua!";
	return undefined;
};
const executeKick = async (
	guildId: Snowflake,
	user: APIUser,
	reason?: string,
): Promise<RESTPatchAPIWebhookWithTokenMessageJSONBody> => {
	reason = reason?.trim();
	const result = await rest
		.delete(Routes.guildMember(guildId, user.id), { reason })
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
		content: `<:kick:${Emojis.kick}> <@${user.id}> (${escapeMarkdown(
			user.username,
		)} - ${user.id}) è stato espulso!\n\nMotivo: ${
			reason !== undefined && reason.length > 0
				? reason.slice(0, 1_000)
				: "*Nessun motivo*"
		}`,
		allowed_mentions: { parse: [] },
	};
};

export const kick = new Command({
	data: [
		{
			type: ApplicationCommandType.ChatInput,
			name: "kick",
			description: "Espelli utente",
			default_member_permissions: String(PermissionFlagsBits.KickMembers),
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
					max_length: 512,
				},
			],
		},
	],
	run: async (reply, { interaction }) => {
		if (
			!(BigInt(interaction.app_permissions) & PermissionFlagsBits.KickMembers)
		) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content:
						'Ho bisogno del permesso "Espellere i membri" per eseguire questo comando!',
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

		for (const option of interaction.data.options)
			options.set(option.name, option);
		const { value: userId } = options.get(
			"member",
		) as APIApplicationCommandInteractionDataUserOption;
		const user = interaction.data.resolved!.users![userId]!;
		const member = interaction.data.resolved!.members?.[userId];

		if (!member) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "Questo utente non è nel server!",
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		const guild = (await rest.get(
			Routes.guild(interaction.guild_id),
		)) as APIGuild;
		const content = checkPerms(interaction.member, guild, user.id, member);

		if (content) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content, flags: MessageFlags.Ephemeral },
			});
			return;
		}
		const reason = (
			options.get("reason") as
				| APIApplicationCommandInteractionDataStringOption
				| undefined
		)?.value;

		reply({ type: InteractionResponseType.DeferredChannelMessageWithSource });
		await rest.patch(
			Routes.webhookMessage(interaction.application_id, interaction.token),
			{
				body: await executeKick(
					interaction.guild_id,
					user,
					reason ?? undefined,
				),
			},
		);
	},
});
