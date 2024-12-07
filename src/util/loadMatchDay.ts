import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import {
	ButtonStyle,
	RESTPostAPIChannelMessageJSONBody,
	Routes,
} from "discord-api-types/v10";
import { loadMatches, rest } from ".";
import { Env, type MatchDayResponse } from "./types";

export const loadMatchDay = async (env: Env, last = 0) => {
	const matchDays = (await fetch(
		`https://legaseriea.it/api/season/${env.SEASON_ID}/championship/A/matchday`,
	).then((res) => res.json())) as MatchDayResponse;

	if (!matchDays.success)
		throw new Error(`Couldn't load season data: ${matchDays.message}`, {
			cause: matchDays.errors,
		});
	const matchDayData = matchDays.data.find(
		(d) =>
			d.id_category > last &&
			(d.category_status === "LIVE" || d.category_status === "TO BE PLAYED"),
	);

	if (!matchDayData) throw new TypeError("No match to be played!");
	const matches = await loadMatches(matchDayData.id_category, 1);

	if (!matches[0]) throw new TypeError("No match found");
	const startTime = Date.parse(matches[0].date_time) - 1_000 * 60 * 15;
	const date = Math.round(startTime / 1_000);

	await Promise.all([
		date - Date.now() / 1_000 > 1 &&
			rest.post(Routes.channelMessages(env.PREDICTIONS_CHANNEL), {
				body: {
					content: `<@&${env.PREDICTIONS_ROLE}>, potete inviare da ora i pronostici per la prossima giornata!\nPer farlo inviate il comando \`/predictions send\` e seguire le istruzioni o premete il pulsante qui in basso. Avete tempo fino a <t:${date}:F> (<t:${date}:R>)!`,
					components: [
						new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId(
										`predictions-${matchDayData.description}-1-${startTime}`,
									)
									.setEmoji({ name: "⚽" })
									.setLabel("Invia pronostici")
									.setStyle(ButtonStyle.Primary),
								new ButtonBuilder()
									.setURL("https://ms-bot.trombett.org/predictions")
									.setEmoji({ name: "🌐" })
									.setLabel("Utilizza la dashboard")
									.setStyle(ButtonStyle.Link),
							)
							.toJSON(),
					],
				} satisfies RESTPostAPIChannelMessageJSONBody,
			}),
	]);
};
