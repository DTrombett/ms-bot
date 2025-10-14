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
import { Command } from "../commandHandler/Command.ts";
import { rest } from "../util/rest.ts";

export class Dog extends Command {
	static override chatInputData = {
		name: "dog",
		description: "Mostra la foto di un adorabile cagnolino",
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
	static override customId = "dog";
	override async chatInput(
		{ defer }: ChatInputReplies,
		{
			interaction,
			options: { limit },
		}: ChatInputArgs<typeof Dog.chatInputData>,
	) {
		defer();
		return this.dog(interaction, limit);
	}
	override async component(
		{ defer }: ComponentReplies,
		{ interaction, args: [limit] }: ComponentArgs,
	) {
		defer({ flags: MessageFlags.Ephemeral });
		return this.dog(interaction, Number(limit) || undefined);
	}
	async dog(
		interaction: Pick<APIInteraction, "application_id" | "token">,
		limit = 1,
	): Promise<unknown> {
		const data = await fetch(
			`https://api.thedogapi.com/v1/images/search?limit=${limit}`,
		).then((res) => res.json<DogResponse | null>());

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
						content: "# Woof! 🐶",
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
								custom_id: "dog",
								emoji: { name: "🐶" },
							},
						],
					},
				],
			} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
		});
	}
}
