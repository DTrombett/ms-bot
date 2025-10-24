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
		replies: ChatInputReplies,
		{
			interaction,
			options: { limit },
		}: ChatInputArgs<typeof Dog.chatInputData>,
	) {
		replies.defer();
		return this.dog(replies.edit, interaction, limit);
	}
	static override component(
		replies: ComponentReplies,
		{ interaction, args: [limit] }: ComponentArgs,
	) {
		replies.defer({ flags: MessageFlags.Ephemeral });
		return this.dog(replies.edit, interaction, Number(limit) || undefined);
	}
	static async dog(
		edit: ChatInputReplies["edit"],
		_interaction: Pick<APIInteraction, "application_id" | "token">,
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
		});
	}
}
