import {
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
} from "discord-api-types/v10";
import { env } from "node:process";
import { request } from "undici";
import type { CatResponse, ReceivedInteraction } from "../util";
import { createCommand } from "../util";

const cat = async (interaction: ReceivedInteraction, ephemeral?: boolean) => {
	const data = await request(
		"https://api.thecatapi.com/v1/images/search?order=RANDOM&limit=1&format=json",
		{
			method: "GET",
			headers: {
				"x-api-key": env.CAT_API_KEY!,
			},
		}
	).then<CatResponse | null>((res) => res.body.json());

	if (!data?.[0]) {
		await interaction.reply({
			content: "Si è verificato un errore nel caricamento dell'immagine!",
		});
		return;
	}
	const [{ url }] = data;

	await interaction.reply({
		content: `[Meow!](${url}) 🐱`,
		ephemeral,
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
	});
};

export const command = createCommand({
	data: [
		{
			name: "cat",
			description: "Mostra la foto di un adorabile gattino",
			type: ApplicationCommandType.ChatInput,
		},
	],
	async run(interaction) {
		await cat(interaction);
	},
	async component(interaction) {
		await cat(interaction, true);
	},
});
