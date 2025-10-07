import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	RESTPatchAPIWebhookWithTokenMessageJSONBody,
	Routes,
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import type {
	ChatInputArgs,
	ChatInputReplies,
	ComponentArgs,
	ComponentReplies,
	DogResponse,
} from "../util";
import { Command, rest } from "../util";

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
		await rest.patch(
			Routes.webhookMessage(interaction.application_id, interaction.token),
			{ body: await this.getDogBody(limit) },
		);
	}
	override async component(
		{ defer }: ComponentReplies,
		{ interaction, args: [limit] }: ComponentArgs,
	) {
		defer({ flags: MessageFlags.Ephemeral });
		await rest.patch(
			Routes.webhookMessage(interaction.application_id, interaction.token),
			{ body: await this.getDogBody(Number(limit) || undefined) },
		);
	}
	async getDogBody(
		limit = 1,
	): Promise<RESTPatchAPIWebhookWithTokenMessageJSONBody> {
		const data = await fetch(
			`https://api.thedogapi.com/v1/images/search?limit=${limit}`,
		).then((res) => res.json<DogResponse | null>());

		if (!data?.length)
			return {
				content: "Si è verificato un errore nel caricamento dell'immagine!",
			};
		return {
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
		};
	}
}
