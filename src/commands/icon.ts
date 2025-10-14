import {
	ApplicationCommandType,
	ComponentType,
	InteractionContextType,
	MessageFlags,
	Routes,
	type APIGuild,
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command.ts";
import { escapeMarkdown } from "../util/formatters.ts";
import { ok } from "../util/node.ts";
import { rest } from "../util/rest.ts";

export class Icon extends Command {
	static override chatInputData = {
		name: "icon",
		description: "Mostra l'icona del server",
		type: ApplicationCommandType.ChatInput,
		contexts: [InteractionContextType.Guild],
	} as const satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;
	override async chatInput(
		{ reply }: ChatInputReplies,
		{ interaction }: ChatInputArgs<typeof Icon.chatInputData>,
	) {
		ok(interaction.guild_id);
		const guild = (await rest.get(
			Routes.guild(interaction.guild_id),
		)) as APIGuild;

		if (guild.icon)
			reply({
				flags: MessageFlags.IsComponentsV2,
				components: [
					{
						type: ComponentType.TextDisplay,
						content: `Icona del server **${escapeMarkdown(guild.name)}**`,
					},
					{
						type: ComponentType.MediaGallery,
						items: [
							{
								media: {
									url: rest.cdn.icon(interaction.guild_id, guild.icon, {
										size: 4096,
										extension: "png",
									}),
								},
							},
						],
					},
				],
			});
		else
			reply({
				content: "Questo server non ha un'icona!",
				flags: MessageFlags.Ephemeral,
			});
	}
}
