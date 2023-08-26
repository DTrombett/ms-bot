import { TimestampStyles } from "@discordjs/builders";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
} from "discord-api-types/v10";
import type { ReceivedInteraction } from "../util";
import { createCommand } from "../util";

const styles = Object.values(TimestampStyles);

type TimestampOptions = {
	year?: number;
	month?: number;
	date?: number;
	hours?: number;
	minutes?: number;
	seconds?: number;
};

const timestamp = async (
	interaction: ReceivedInteraction,
	options: TimestampOptions = {},
	ephemeral?: boolean
) => {
	if (typeof options.year !== typeof options.month) {
		await interaction.reply({
			ephemeral: true,
			content:
				"Un timestamp personalizzato richiede sia l'anno che il mese! Se non vuoi un timestamp personalizzato non inserire nessuna opzione.",
		});
		return;
	}
	const d = Math.round(
		(options.year === undefined
			? new Date()
			: new Date(
					new Date(
						options.year,
						options.month! - 1,
						options.date ?? 1,
						options.hours ?? 0,
						options.minutes ?? 0,
						options.seconds ?? 0
					).toLocaleString("en-US", {
						timeZone: "Europe/Rome",
					})
			  )
		).getTime() / 1000
	);
	await interaction.reply({
		content: `<t:${d}> (\`<t:${d}>\`)\n\n${styles
			.map((style) => `<t:${d}:${style}> (\`<t:${d}:${style}>\`)`)
			.join("\n")}`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: "Genera nuovo!",
						custom_id: "timestamp",
						style: ButtonStyle.Primary,
						emoji: { name: "⌚" },
					},
				],
			},
		],
		ephemeral,
	});
};

export const timestampCommand = createCommand({
	data: [
		{
			name: "timestamp",
			description: "Genera un timestamp per una certa data",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "year",
					description: "L'anno solare (richiesto per un timestamp personalizzato)",
					type: ApplicationCommandOptionType.Integer,
				},
				{
					name: "month",
					description: "Il mese dell'anno (richiesto per una timestamp personalizzata)",
					type: ApplicationCommandOptionType.Integer,
					min_value: 1,
					max_value: 12,
				},
				{
					name: "date",
					description: "Il giorno del mese",
					type: ApplicationCommandOptionType.Integer,
					min_value: 1,
					max_value: 31,
				},
				{
					name: "hours",
					description: "Le ore del giorno",
					type: ApplicationCommandOptionType.Integer,
					min_value: 0,
					max_value: 23,
				},
				{
					name: "minutes",
					description: "I minuti",
					type: ApplicationCommandOptionType.Integer,
					min_value: 0,
					max_value: 59,
				},
				{
					name: "seconds",
					description: "I secondi",
					type: ApplicationCommandOptionType.Integer,
					min_value: 0,
					max_value: 59,
				},
			],
		},
	],
	async run(interaction) {
		const options: TimestampOptions = {};

		for (const option of interaction.options.data)
			if (typeof option.value === "number")
				options[option.name as keyof TimestampOptions] = option.value;
		await timestamp(interaction, options);
	},
	async component(interaction) {
		await timestamp(interaction, undefined, true);
	},
});
