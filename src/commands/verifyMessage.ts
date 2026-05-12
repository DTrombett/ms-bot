import {
	AllowedMentionsTypes,
	ApplicationCommandType,
	ComponentType,
	EmbedType,
	InteractionContextType,
	MessageFlags,
	MessageType,
	Routes,
	WebhookType,
	type APITextDisplayComponent,
	type RESTGetAPIChannelResult,
	type RESTGetAPIChannelWebhooksResult,
	type RESTPostAPIChannelWebhookJSONBody,
	type RESTPostAPIChannelWebhookResult,
	type RESTPostAPIContextMenuApplicationCommandsJSONBody,
	type RESTPostAPIWebhookWithTokenJSONBody,
	type RESTPostAPIWebhookWithTokenQuery,
	type RESTPostAPIWebhookWithTokenWaitResult,
} from "discord-api-types/v10";
import Command from "../Command";
import { rest } from "../util/globals";
import normalizeError from "../util/normalizeError";
import { toSearchParams } from "../util/objects";

export class VerifyMessage extends Command {
	static override contextMenuData = [
		{
			name: "Verify Message",
			type: ApplicationCommandType.Message,
			contexts: [InteractionContextType.Guild],
			default_member_permissions: "0",
		},
	] satisfies RESTPostAPIContextMenuApplicationCommandsJSONBody[];
	static override async message(
		{ reply, edit }: MessageReplies,
		{ interaction: { data, guild_id, application_id } }: MessageArgs,
	) {
		const message = data.resolved.messages[data.target_id];
		const embed = message?.embeds.find(
			(e) => e.type === EmbedType.AutoModerationMessage,
		);
		let channelId = embed?.fields?.find((f) => f.name === "channel_id")?.value,
			thread_id: string | undefined;
		if (message?.type !== MessageType.AutoModerationAction || !embed)
			return reply({
				content: "Usa questo comando su un messaggio dell'automod!",
				flags: MessageFlags.Ephemeral,
			});
		if (!channelId)
			return reply({
				content: "Usa questo comando su un messaggio bloccato!",
				flags: MessageFlags.Ephemeral,
			});
		const components: [APITextDisplayComponent, APITextDisplayComponent] = [
			{ type: ComponentType.TextDisplay, content: `>>> ${embed.description}` },
			{
				type: ComponentType.TextDisplay,
				content: `Sto inviando il seguente messaggio in <#${channelId}> come ${message.author.global_name ?? message.author.username}...`,
			},
		];

		reply({
			components,
			flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
		});
		try {
			const channel = (await rest.get(
				Routes.channel(channelId),
			)) as RESTGetAPIChannelResult;
			if ("thread_metadata" in channel) {
				thread_id = channelId;
				channelId = channel.parent_id!;
			}
			const webhooks = (await rest.get(
				Routes.channelWebhooks(channelId),
			)) as RESTGetAPIChannelWebhooksResult;
			const webhook =
				webhooks.find(
					(v) =>
						v.type === WebhookType.Incoming &&
						v.application_id === application_id,
				) ??
				((await rest.post(Routes.channelWebhooks(channelId), {
					body: { name: "MS Bot" } satisfies RESTPostAPIChannelWebhookJSONBody,
				})) as RESTPostAPIChannelWebhookResult);
			const { id } = (await rest.post(
				Routes.webhook(webhook.id, webhook.token),
				{
					query: toSearchParams({
						wait: true,
						thread_id,
					} satisfies RESTPostAPIWebhookWithTokenQuery),
					body: {
						avatar_url:
							message.author.avatar ?
								rest.cdn.avatar(message.author.id, message.author.avatar, {
									size: 4096,
									extension: "png",
								})
							:	rest.cdn.defaultAvatar(
									message.author.discriminator === "0" ?
										Number(BigInt(message.author.id) >> 22n) % 6
									:	Number(message.author.discriminator) % 5,
								),
						username: message.author.global_name ?? message.author.username,
						content: embed.description,
						allowed_mentions: { parse: [AllowedMentionsTypes.User] },
					} satisfies RESTPostAPIWebhookWithTokenJSONBody,
				},
			)) as RESTPostAPIWebhookWithTokenWaitResult;

			components[1].content = `Messaggio inviato: https://discord.com/channels/${guild_id}/${thread_id ?? channelId}/${id}`;
			return edit({ components });
		} catch (err) {
			components[1].content = normalizeError(err).toString();
			return edit({ components });
		}
	}
}
