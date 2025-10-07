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
	CatResponse,
	ChatInputArgs,
	ChatInputReplies,
	ComponentArgs,
	ComponentReplies,
} from "../util";
import { Command, rest } from "../util";

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
		await rest.patch(
			Routes.webhookMessage(interaction.application_id, interaction.token),
			{ body: await this.getCatBody(limit) },
		);
	}
	override async component(
		{ defer }: ComponentReplies,
		{ interaction, args: [limit] }: ComponentArgs,
	) {
		defer({ flags: MessageFlags.Ephemeral });
		await rest.patch(
			Routes.webhookMessage(interaction.application_id, interaction.token),
			{ body: await this.getCatBody(Number(limit) || undefined) },
		);
	}
	async getCatBody(
		limit = 1,
	): Promise<RESTPatchAPIWebhookWithTokenMessageJSONBody> {
		const data = await fetch(
			`https://api.thecatapi.com/v1/images/search?limit=${limit}`,
		).then((res) => res.json<CatResponse | null>());

		if (!data?.length)
			return {
				content: "Si è verificato un errore nel caricamento dell'immagine!",
			};
		return {
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
		};
	}
}
