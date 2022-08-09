import type { Snowflake } from "discord-api-types/v10";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
} from "discord-api-types/v10";
import { createCommand } from "../util";

const formatQuote = ([id, q]: [id: Snowflake, quote: string]): {
	name: string;
	value: string;
} => {
	const [, , quote] = q.split(/(> )|\n/);

	return {
		name: quote.length > 100 ? `${quote.slice(0, 97).trimEnd()}...` : quote,
		value: id,
	};
};

export const command = createCommand({
	data: [
		{
			name: "quote",
			description:
				"Invia una citazione di Trombett. Non fornire nessuna opzione per una casuale",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "quote",
					description: "La citazione da mostrare",
					type: ApplicationCommandOptionType.String,
					autocomplete: true,
				},
			],
		},
	],
	async run(interaction) {
		if (!this.client.quotes.size) {
			await interaction.reply({
				content: "Comando non disponibile!",
				ephemeral: true,
			});
			return;
		}
		const option = interaction.options.data[0]?.value;

		if (option !== undefined && typeof option !== "string") {
			await interaction.reply({
				content: "Opzione non valida!",
				ephemeral: true,
			});
			return;
		}
		const quote = option!
			? this.client.quotes.get(option)
			: [...this.client.quotes][
					Math.floor(Math.random() * this.client.quotes.size)
			  ][1];

		if (!quote!) {
			await interaction.reply({
				content:
					"Citazione non trovata! Assicurati di usare l'autocomplete o fornisci l'id di una citazione.",
				ephemeral: true,
			});
			return;
		}
		await interaction.reply({
			content: quote,
		});
	},
	async autocomplete(interaction) {
		let option = interaction.options.getFocused();

		if (!option) {
			await interaction.respond(
				[...this.client.quotes].slice(0, 25).map(formatQuote)
			);
			return;
		}
		option = option.toLowerCase();
		await interaction.respond(
			[
				...this.client.quotes.filter((q) =>
					q
						.split(/(> )|\n/)[2]
						.toLowerCase()
						.includes(option)
				),
			]
				.slice(0, 25)
				.map(formatQuote)
		);
	},
});
