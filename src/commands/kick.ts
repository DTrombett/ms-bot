import {
	APIGuild,
	APIUser,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionContextType,
	MessageFlags,
	PermissionFlagsBits,
	RESTPatchAPIWebhookWithTokenMessageJSONBody,
	Routes,
	Snowflake,
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import {
	Command,
	Emojis,
	escapeMarkdown,
	maxLength,
	normalizeError,
	ok,
	rest,
	type ChatInputArgs,
	type ChatInputReplies,
} from "../util";
import { Bann } from "./bann";

export class Kick extends Command {
	static override chatInputData = {
		type: ApplicationCommandType.ChatInput,
		name: "kick",
		description: "Espelli utente",
		default_member_permissions: String(PermissionFlagsBits.KickMembers),
		contexts: [InteractionContextType.Guild],
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
	} as const satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;
	override async chatInput(
		{ reply, defer }: ChatInputReplies,
		{ interaction, options }: ChatInputArgs<typeof Kick.chatInputData>,
	) {
		if (
			!(BigInt(interaction.app_permissions) & PermissionFlagsBits.KickMembers)
		)
			return reply({
				content:
					'Ho bisogno del permesso "Espellere i membri" per eseguire questo comando!',
				flags: MessageFlags.Ephemeral,
			});
		ok(
			interaction.member &&
				interaction.guild_id &&
				interaction.data.resolved?.users,
		);
		const member = interaction.data.resolved?.members?.[options.member];
		if (!member)
			return reply({
				content: "Questo utente non è nel server!",
				flags: MessageFlags.Ephemeral,
			});
		const user = interaction.data.resolved.users[options.member];
		const guild = (await rest.get(
			Routes.guild(interaction.guild_id),
		)) as APIGuild;
		const content = Bann.checkPerms(
			interaction.member,
			guild,
			options.member,
			member,
		);

		if (content)
			return reply({
				content,
				flags: MessageFlags.Ephemeral,
			});
		defer();
		return rest.patch(
			Routes.webhookMessage(interaction.application_id, interaction.token),
			{
				body: await this.executeKick(
					interaction.guild_id,
					user!,
					options.reason,
				),
			},
		);
	}
	async executeKick(
		guildId: Snowflake,
		user: APIUser,
		reason?: string,
	): Promise<RESTPatchAPIWebhookWithTokenMessageJSONBody> {
		reason = reason?.trim();
		const error = await rest
			.delete(Routes.guildMember(guildId, user.id), { reason })
			.then(() => {})
			.catch(normalizeError);

		if (error)
			return {
				content: `Si è verificato un errore: \`${error.message.slice(
					0,
					1_000,
				)}\``,
				allowed_mentions: { parse: [] },
			};
		return {
			content: `<:kick:${Emojis.kick}> <@${user.id}> (${escapeMarkdown(
				user.username,
			)} - ${user.id}) è stato espulso!\n\nMotivo: ${maxLength(reason ?? "*Nessun motivo*", 1_000)}`,
			allowed_mentions: { parse: [] },
		};
	}
}
