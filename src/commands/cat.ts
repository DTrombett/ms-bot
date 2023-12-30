import {
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionResponseType,
	MessageFlags,
	RESTPatchAPIWebhookWithTokenMessageJSONBody,
	Routes,
} from "discord-api-types/v10";
import type { CatResponse } from "../util";
import { createCommand } from "../util";

const getCat = async (
	key: string,
): Promise<RESTPatchAPIWebhookWithTokenMessageJSONBody> => {
	const data = await fetch(
		"https://api.thecatapi.com/v1/images/search?order=RANDOM&limit=1&format=json",
		{ headers: { "x-api-key": key } },
	).then((res) => res.json() as Promise<CatResponse | null>);

	if (!data?.[0])
		return {
			content: "Si è verificato un errore nel caricamento dell'immagine!",
		};
	const [{ url }] = data;

	return {
		content: `[Meow!](${url}) 🐱`,
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
						custom_id: "cat",
						emoji: { name: "🐱" },
					},
				],
			},
		],
	};
};

export const cat = createCommand({
	data: [
		{
			name: "cat",
			description: "Mostra la foto di un adorabile gattino",
			type: ApplicationCommandType.ChatInput,
		},
	],
	async run(interaction, { reply, env }) {
		reply({ type: InteractionResponseType.DeferredChannelMessageWithSource });
		await this.api.patch(
			Routes.webhookMessage(interaction.application_id, interaction.token),
			{ body: await getCat(env.CAT_API_KEY) },
		);
	},
	async component(interaction, { reply, env }) {
		reply({
			type: InteractionResponseType.DeferredChannelMessageWithSource,
			data: { flags: MessageFlags.Ephemeral },
		});
		await this.api.patch(
			Routes.webhookMessage(interaction.application_id, interaction.token),
			{ body: await getCat(env.CAT_API_KEY) },
		);
	},
});
