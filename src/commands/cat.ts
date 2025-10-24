import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	type APIInteraction,
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command.ts";

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
	static override async chatInput(
		replies: ChatInputReplies,
		{
			interaction,
			options: { limit },
		}: ChatInputArgs<typeof Cat.chatInputData>,
	) {
		replies.defer();
		return this.cat(replies.edit, interaction, limit);
	}
	static override async component(
		replies: ComponentReplies,
		{ interaction, args: [limit] }: ComponentArgs,
	) {
		replies.defer({ flags: MessageFlags.Ephemeral });
		return this.cat(replies.edit, interaction, Number(limit) || undefined);
	}
	static async cat(
		edit: ChatInputReplies["edit"],
		_interaction: Pick<APIInteraction, "application_id" | "token">,
		limit = 1,
	): Promise<unknown> {
		const data = await fetch(
			`https://api.thecatapi.com/v1/images/search?limit=${limit}`,
		).then((res) => res.json<CatResponse | null>());

		if (!data?.length)
			return edit({
				content: "Si è verificato un errore nel caricamento dell'immagine!",
			});
		return edit({
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
		});
	}
}
