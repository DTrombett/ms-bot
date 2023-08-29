import { ApplicationCommandType, ButtonStyle, ComponentType } from "discord.js";
import { env } from "node:process";
import { request } from "undici";
import type { CatResponse, ReceivedInteraction } from "../util";
import { createCommand } from "../util";

const sendCat = async (interaction: ReceivedInteraction, ephemeral?: boolean) => {
	const data = await request(
		"https://api.thecatapi.com/v1/images/search?order=RANDOM&limit=1&format=json",
		{
			method: "GET",
			headers: {
				"x-api-key": env.CAT_API_KEY!,
			},
		},
	).then((res) => res.body.json() as Promise<CatResponse | null>);

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

export const catCommand = createCommand({
	data: [
		{
			name: "cat",
			description: "Mostra la foto di un adorabile gattino",
			type: ApplicationCommandType.ChatInput,
		},
	],
	async run(interaction) {
		await sendCat(interaction);
	},
	async component(interaction) {
		await sendCat(interaction, true);
	},
});
