import { env } from "cloudflare:workers";
import {
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
	} satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;
	static override customId = "cat";
	override async chatInput(
		{ defer }: ChatInputReplies,
		{ interaction }: ChatInputArgs,
	) {
		defer();
		await rest.patch(
			Routes.webhookMessage(interaction.application_id, interaction.token),
			{ body: await this.getCat(env.CAT_API_KEY) },
		);
	}
	override async component(
		{ defer }: ComponentReplies,
		{ interaction }: ComponentArgs,
	) {
		defer({ flags: MessageFlags.Ephemeral });
		await rest.patch(
			Routes.webhookMessage(interaction.application_id, interaction.token),
			{ body: await this.getCat(env.CAT_API_KEY) },
		);
	}
	async getCat(
		key: string,
	): Promise<RESTPatchAPIWebhookWithTokenMessageJSONBody> {
		const data = await fetch(
			"https://api.thecatapi.com/v1/images/search?order=RANDOM&limit=1&format=json",
			{ headers: { "x-api-key": key } },
		).then<CatResponse | null>((res) => res.json());

		if (!data?.[0])
			return {
				content: "Si è verificato un errore nel caricamento dell'immagine!",
			};
		return {
			flags: MessageFlags.IsComponentsV2,
			components: [
				{
					type: ComponentType.TextDisplay,
					content: "Meow! 🐱",
				},
				{
					type: ComponentType.MediaGallery,
					items: [{ media: data[0] }],
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
			allowed_mentions: { parse: [] },
		};
	}
}
