import type { Collection, Message } from "discord.js";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
} from "discord.js";
import { env } from "node:process";
import { createCommand } from "../util";

let messages: Collection<string, Message> | null = null;

const formatQuote = ({
	content,
	id,
}: Message): {
	name: string;
	value: string;
} => {
	const [, , quote] = content.split(/(> )|\n/);

	return {
		name: quote.length > 100 ? `${quote.slice(0, 97).trimEnd()}...` : quote,
		value: id,
	};
};

export const quoteCommand = createCommand({
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
		if (!messages) {
			const channel = interaction.client.channels.cache.get(
				env.QUOTES_CHANNEL!,
			);

			if (!channel?.isTextBased()) {
				await interaction.reply({
					content: "Comando non disponibile!",
					ephemeral: true,
				});
				return;
			}
			messages = channel.messages.cache;
			if (!messages.size) {
				await interaction.reply({
					content: "Nessuna citazione disponibile!",
					ephemeral: true,
				});
				messages = null;
				return;
			}
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
			? messages.get(option)?.content
			: messages.random()?.content;

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
		if (!messages) {
			const channel = interaction.client.channels.cache.get(
				env.QUOTES_CHANNEL!,
			);

			if (!channel?.isTextBased()) {
				await interaction.respond([]);
				return;
			}
			messages = channel.messages.cache;
			if (!messages.size) {
				await interaction.respond([]);
				messages = null;
				return;
			}
		}
		let option = interaction.options.getFocused();

		if (!option) {
			await interaction.respond(messages.first(25).map(formatQuote));
			return;
		}
		option = option.toLowerCase();
		await interaction.respond(
			messages
				.filter((q) =>
					q.content
						.split(/(> )|\n/)[2]
						.toLowerCase()
						.includes(option),
				)
				.first(25)
				.map(formatQuote),
		);
	},
});
