import {
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionResponseType,
	MessageFlags,
	RESTPatchAPIWebhookWithTokenMessageJSONBody,
	Routes,
} from "discord-api-types/v10";
import type { DogResponse } from "../util";
import { createCommand } from "../util";

const getDog = async (
	key: string,
): Promise<RESTPatchAPIWebhookWithTokenMessageJSONBody> => {
	const data = await fetch(
		"https://api.thedogapi.com/v1/images/search?order=RANDOM&limit=1&format=json",
		{ headers: { "x-api-key": key } },
	).then((res) => res.json() as Promise<DogResponse | null>);

	if (!data?.[0])
		return {
			content: "Si è verificato un errore nel caricamento dell'immagine!",
		};
	const [{ url }] = data;

	return {
		content: `[Woof!](${url}) 🐶`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						url,
						style: ButtonStyle.Link,
						label: "Apri l'originale",
					},
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
};

export const dog = createCommand({
	data: [
		{
			name: "dog",
			description: "Mostra la foto di un adorabile cagnolino",
			type: ApplicationCommandType.ChatInput,
		},
	],
	async run(interaction, { reply, env }) {
		reply({ type: InteractionResponseType.DeferredChannelMessageWithSource });
		await this.api.patch(
			Routes.webhookMessage(interaction.application_id, interaction.token),
			{ body: await getDog(env.DOG_API_KEY) },
		);
	},
	async component(interaction, { reply, env }) {
		reply({
			type: InteractionResponseType.DeferredChannelMessageWithSource,
			data: { flags: MessageFlags.Ephemeral },
		});
		await this.api.patch(
			Routes.webhookMessage(interaction.application_id, interaction.token),
			{ body: await getDog(env.DOG_API_KEY) },
		);
	},
});
