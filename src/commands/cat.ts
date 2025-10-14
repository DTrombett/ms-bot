import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	Routes,
	type APIInteraction,
	type RESTPatchAPIWebhookWithTokenMessageJSONBody,
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command.ts";
import { rest } from "../util/rest.ts";

export class Cat extends Command {
	static override chatInputData = {
		name: "cat",
		description: "Mostra la foto di un adorabile gattino",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				name: "limit",
				description: "Numero di immagini da mostrare",
				type: ApplicationCommandOptionType.Integer,
				min_value: 1,
				max_value: 9,
			},
		],
	} as const satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;
	static override customId = "cat";
	override async chatInput(
		{ defer }: ChatInputReplies,
		{
			interaction,
			options: { limit },
		}: ChatInputArgs<typeof Cat.chatInputData>,
	) {
		defer();
		return this.cat(interaction, limit);
	}
	override async component(
		{ defer }: ComponentReplies,
		{ interaction, args: [limit] }: ComponentArgs,
	) {
		defer({ flags: MessageFlags.Ephemeral });
		return this.cat(interaction, Number(limit) || undefined);
	}
	async cat(
		interaction: Pick<APIInteraction, "application_id" | "token">,
		limit = 1,
	): Promise<unknown> {
		const data = await fetch(
			`https://api.thecatapi.com/v1/images/search?limit=${limit}`,
		).then((res) => res.json<CatResponse | null>());
		const fullRoute = Routes.webhookMessage(
			interaction.application_id,
			interaction.token,
		);

		if (!data?.length)
			return rest.patch(fullRoute, {
				body: {
					content: "Si è verificato un errore nel caricamento dell'immagine!",
				} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
			});
		return rest.patch(fullRoute, {
			body: {
				flags: MessageFlags.IsComponentsV2,
				components: [
					{
						type: ComponentType.TextDisplay,
						content: "# Meow! 🐱",
					},
					{
						type: ComponentType.MediaGallery,
						items: data.slice(0, limit).map((media) => ({ media })),
					},
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								style: ButtonStyle.Success,
								label: "Un altro!",
								custom_id: "cat",
								emoji: { name: "🐱" },
							},
						],
					},
				],
			} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
		});
	}
}
