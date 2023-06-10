import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
} from "discord-api-types/v10";
import { request } from "undici";
import type { ReceivedInteraction, UrbanResponse } from "../util";
import { createCommand } from "../util";

let updateDay = 0;
let wordsOfTheDay: string[] | undefined;

const replacer = (s: string) =>
	`${s}(https://urbandictionary.com/define.php?term=${encodeURIComponent(
		s.slice(1, -1)
	)})` as const;
const urban = async (interaction: ReceivedInteraction, query: string, i = 0, ephemeral = false) => {
	if (Number.isNaN(i)) {
		await interaction.reply({
			content: "Invalid index.",
			ephemeral: true,
		});
		return;
	}
	const { body } = await request(`https://api.urbandictionary.com/v0/define?term=${query}`);
	const data: UrbanResponse | undefined = await body.json();
	const def = data?.list[i];

	if (!def) {
		await interaction.reply({
			content: "Nessun risultato trovato!",
			ephemeral: true,
		});
		return;
	}
	await interaction.reply({
		embeds: [
			{
				author: {
					name: def.author,
					url: `https://urbandictionary.com/author.php?author=${encodeURIComponent(def.author)}`,
				},
				color: 0x134fe6,
				description: def.definition.replace(/\[.+?\]/g, replacer),
				fields: [
					{
						name: "Esempio",
						value: `${def.example.replace(/\[.+?\]/g, replacer)}\n\n👍 ${def.thumbs_up} 👎 ${
							def.thumbs_down
						}`,
					},
				],
				url: `https://urbandictionary.com/define.php?term=${encodeURIComponent(def.word)}`,
				timestamp: def.written_on,
				title: `Definizione di "${
					def.word.length > 83 ? `${def.word.slice(0, 80)}...` : def.word
				}"`,
				footer: {
					text: `Risultato ${i + 1}/${data.list.length}`,
				},
			},
		],
		components:
			query.length < 92 && data.list.length > 1
				? [
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									label: "Precedente",
									custom_id: `urban-${query}-${i - 1}`,
									disabled: i === 0,
									style: ButtonStyle.Primary,
								},
								{
									type: ComponentType.Button,
									label: "Successivo",
									custom_id: `urban-${query}-${i + 1}`,
									disabled: i === data.list.length - 1,
									style: ButtonStyle.Primary,
								},
							],
						},
				  ]
				: undefined,
		ephemeral,
	});
};

export const command = createCommand({
	data: [
		{
			name: "urban",
			description: "Cerca qualcosa su Urban Dictionary",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "query",
					description: "La query da cercare",
					type: ApplicationCommandOptionType.String,
					required: true,
					autocomplete: true,
				},
			],
		},
	],
	async run(interaction) {
		const query = interaction.options.data[0].value;

		if (typeof query !== "string") {
			await interaction.reply({
				content: "Query non valida!",
			});
			return;
		}
		await urban(interaction, query);
	},
	async component(interaction) {
		const [, query, i] = interaction.customId.split("-");

		if (typeof query !== "string") {
			await interaction.reply({
				content: "Query non valida!",
				ephemeral: true,
			});
			return;
		}
		await urban(interaction, query, Number(i), true);
	},
	async autocomplete(interaction) {
		const query = interaction.options.data[0].value;

		if (typeof query !== "string" || !query) {
			const date = new Date().getDate();

			if (updateDay !== date || !wordsOfTheDay) {
				const { body } = await request("https://api.urbandictionary.com/v0/words_of_the_day");
				const data: UrbanResponse | undefined = await body.json();

				wordsOfTheDay = data?.list.slice(0, 25).map((x) => x.word);
				updateDay = date;
			}
			await interaction.respond(wordsOfTheDay!.map((value) => ({ name: value, value })));
			return;
		}
		const { body } = await request(`https://api.urbandictionary.com/v0/autocomplete?term=${query}`);
		const list: string[] = await body.json();

		if (!Array.isArray(list)) {
			await interaction.respond([]);
			return;
		}
		await interaction.respond(
			list.slice(0, 25).map((value) => ({
				name: value,
				value,
			}))
		);
	},
});
