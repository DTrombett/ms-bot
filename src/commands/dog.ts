import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command";

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
	static override chatInput(
		{ defer, edit }: ChatInputReplies,
		{ options: { limit } }: ChatInputArgs<typeof Dog.chatInputData>,
	) {
		defer();
		return this.dog(edit, limit);
	}
	static override component(
		{ defer, edit }: ComponentReplies,
		{ args: [limit] }: ComponentArgs,
	) {
		defer({ flags: MessageFlags.Ephemeral });
		return this.dog(edit, Number(limit) || undefined);
	}
	static async dog(
		edit: ChatInputReplies["edit"],
		limit = 1,
	): Promise<unknown> {
		const data = await fetch(
			`https://api.thedogapi.com/v1/images/search?limit=${limit}`,
		).then((res) => res.json<DogResponse | null>());

		if (!data?.length)
			return edit({
				content: "Si è verificato un errore nel caricamento dell'immagine!",
			});
		return edit({
			flags: MessageFlags.IsComponentsV2,
			components: [
				{ type: ComponentType.TextDisplay, content: "# Woof! 🐶" },
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
		});
	}
}
