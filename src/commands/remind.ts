import { ApplicationCommandOptionType, ApplicationCommandType, escapeInlineCode } from "discord.js";
import ms from "ms";
import { Timeout } from "../models";
import { createCommand, setPermanentTimeout, timeoutCache } from "../util";

const remindLimit = 10;

export const remindCommand = createCommand({
	data: [
		{
			name: "remind",
			description: "Imposta un promemoria",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "me",
					description: "Aggiungi un promemoria",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "to",
							description: "Che cosa ricordarti (es. fare la spesa)",
							type: ApplicationCommandOptionType.String,
							required: true,
						},
						{
							name: "when",
							description: "Quando inviare il promemoria (es. 1d)",
							type: ApplicationCommandOptionType.String,
							required: true,
						},
					],
				},
				{
					name: "list",
					description: "Elenca i tuoi promemoria",
					type: ApplicationCommandOptionType.Subcommand,
				},
				{
					name: "remove",
					description: "Rimuovi un promemoria",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "remind",
							description: "Il promemoria da rimuovere",
							type: ApplicationCommandOptionType.String,
							autocomplete: true,
							required: true,
						},
					],
				},
			],
		},
	],
	async run(interaction) {
		switch (interaction.options.getSubcommand()) {
			case "me":
				if (
					(await Timeout.countDocuments({ action: "remind", "options.0": interaction.user.id })) >
					remindLimit
				) {
					await interaction.reply({
						ephemeral: true,
						content: `Non puoi avere più di ${remindLimit} promemoria!`,
					});
					return;
				}
				const date = interaction.createdTimestamp + ms(interaction.options.getString("when", true));

				if (Number.isNaN(date) || date > 10_000_000_000_000) {
					await interaction.reply({
						ephemeral: true,
						content: "Durata non valida!",
					});
					return;
				}
				const [timeout] = await Promise.all([
					setPermanentTimeout(this.client, {
						action: "remind",
						date,
						options: [interaction.user.id, interaction.options.getString("to", true)],
					}),
					interaction.deferReply({ ephemeral: true }),
				]);

				timeoutCache[timeout.id as string] = timeout;
				await interaction.editReply({
					content: `Fatto! Te lo ricorderò <t:${Math.round(date / 1_000)}:R>`,
				});
				break;
			case "list":
				const reminds = Object.values(timeoutCache).filter(
					(t): t is NonNullable<typeof t> =>
						t?.action === "remind" && t.options[0] === interaction.user.id,
				);

				if (reminds.length === 0) {
					await interaction.reply({
						ephemeral: true,
						content: "Non hai impostato ancora alcun promemoria!",
					});
					return;
				}
				await interaction.reply({
					ephemeral: true,
					content: `Ecco i tuoi promemoria:\n\n${reminds
						.sort((a, b) => a.date - b.date)
						.map((t, i) => {
							const timestamp = Math.round(t.date / 1_000);

							return `${i + 1}. \`${escapeInlineCode(
								t.options[1],
							)}\` <t:${timestamp}:F> (<t:${timestamp}:R>)`;
						})
						.join("\n")}`,
				});
				break;
			case "remove":
				// Here the id *should* be the id of the remind to remove but there's a possibility that the user didn't select the option and sent the reminder text
				const id = interaction.options.getString("remind", true);
				const toRemove =
					timeoutCache[id]?.options[0] === interaction.user.id &&
					timeoutCache[id]?.action === "remind"
						? timeoutCache[id]
						: Object.values(timeoutCache).find(
								(t) =>
									t?.action === "remind" &&
									t.options[0] === interaction.user.id &&
									t.options[1] === id,
						  );

				if (!toRemove) {
					await interaction.reply({ ephemeral: true, content: "Promemoria non trovato!" });
					return;
				}
				await toRemove.deleteOne();
				delete timeoutCache[toRemove.id as string];
				await interaction.reply({ ephemeral: true, content: "Promemoria eliminato!" });
				break;
			default:
				break;
		}
	},
	async autocomplete(interaction) {
		const reminds = Object.values(timeoutCache).filter(
			(t) => t?.action === "remind" && t.options[0] === interaction.user.id,
		);
		const query = interaction.options.getString("remind")?.toLowerCase() ?? "";

		await interaction.respond(
			reminds
				.filter(
					(t): t is NonNullable<typeof t> => t?.options[1].toLowerCase().includes(query) ?? false,
				)
				.slice(0, 25)
				.sort((a, b) => a.date - b.date)
				.map((t) => {
					let name = ` (in ${ms(Math.round(t.date - Date.now()), {
						long: true,
					})})`;

					name =
						(t.options[1].length > 100 - name.length
							? `${t.options[1].slice(0, 97 - name.length)}...`
							: t.options[1]) + name;
					return {
						name,
						value: t.id,
					};
				}),
		);
	},
});
