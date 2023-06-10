import { ApplicationCommandType, ButtonStyle, ComponentType } from "discord-api-types/v10";
import { env } from "node:process";
import { request } from "undici";
import type { DogResponse, ReceivedInteraction } from "../util";
import { createCommand } from "../util";

const dog = async (interaction: ReceivedInteraction, ephemeral?: boolean) => {
	const data = await request(
		"https://api.thedogapi.com/v1/images/search?order=RANDOM&limit=1&format=json",
		{
			method: "GET",
			headers: {
				"x-api-key": env.DOG_API_KEY!,
			},
		}
	).then<DogResponse | null>((res) => res.body.json());

	if (!data?.[0]) {
		await interaction.reply({
			content: "Si è verificato un errore nel caricamento dell'immagine!",
		});
		return;
	}
	const [{ url }] = data;

	await interaction.reply({
		content: `[Woof!](${url}) 🐶`,
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
						custom_id: "dog",
						emoji: { name: "🐶" },
					},
				],
			},
		],
	});
};

export const command = createCommand({
	data: [
		{
			name: "dog",
			description: "Mostra la foto di un adorabile cagnolino",
			type: ApplicationCommandType.ChatInput,
		},
	],
	async run(interaction) {
		await dog(interaction);
	},
	async component(interaction) {
		await dog(interaction, true);
	},
});
