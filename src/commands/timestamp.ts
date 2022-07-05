import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";
import { timestamp } from "../util";

enum Options {
	year = "anno",
	month = "mese",
	date = "giorno",
	hours = "ore",
	minutes = "minuti",
	seconds = "secondi",
}

declare global {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Number {
		toString(): `${number}`;
	}
}

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("timestamp")
		.setDescription(
			"Crea una timestamp personalizzata o lascia vuoti i parametri per una attuale"
		)
		.addIntegerOption((year) =>
			year
				.setName(Options.year)
				.setDescription(
					"L'anno solare (richiesto per una timestamp personalizzata)"
				)
		)
		.addIntegerOption((month) =>
			month
				.setName(Options.month)
				.setDescription(
					"Il mese dell'anno (richiesto per una timestamp personalizzata)"
				)
				.setMinValue(1)
				.setMaxValue(12)
		)
		.addIntegerOption((date) =>
			date
				.setName(Options.date)
				.setDescription("Il giorno del mese")
				.setMinValue(1)
				.setMaxValue(31)
		)
		.addIntegerOption((hours) =>
			hours
				.setName(Options.hours)
				.setDescription("Le ore del giorno")
				.setMinValue(0)
				.setMaxValue(23)
		)
		.addIntegerOption((minutes) =>
			minutes
				.setName(Options.minutes)
				.setDescription("I minuti")
				.setMinValue(0)
				.setMaxValue(59)
		)
		.addIntegerOption((seconds) =>
			seconds
				.setName(Options.seconds)
				.setDescription("I secondi")
				.setMinValue(0)
				.setMaxValue(59)
		),
	isPublic: true,
	async run(interaction) {
		await interaction.reply(
			await timestamp(
				this.client,
				interaction.options.getInteger(Options.year)?.toString(),
				interaction.options.getInteger(Options.month)?.toString(),
				interaction.options.getInteger(Options.date)?.toString(),
				interaction.options.getInteger(Options.hours)?.toString(),
				interaction.options.getInteger(Options.minutes)?.toString(),
				interaction.options.getInteger(Options.seconds)?.toString()
			)
		);
	},
};
