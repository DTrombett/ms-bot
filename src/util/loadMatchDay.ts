import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import {
	ButtonStyle,
	RESTPostAPIChannelMessageJSONBody,
	Routes,
} from "discord-api-types/v10";
import { loadMatches, rest } from ".";
import { Env, MatchDay } from "./types";

export const loadMatchDay = async (env: Env, last = 0) => {
	const matchDays = (await fetch(
		`https://www.legaseriea.it/api/season/${env.SEASON_ID}/championship/A/matchday`,
	).then((res) => res.json())) as
		| {
				success: true;
				data: {
					category_status: "LIVE" | "PLAYED" | "TO BE PLAYED";
					description: `${number}`;
					id_category: number;
				}[];
		  }
		| { success: false; message: string; errors: unknown[] };

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
	const matchDay: MatchDay = {
		day: Number(matchDayData.description),
		categoryId: Number(matchDayData.id_category),
		startDate: "",
	};
	const matches = await loadMatches(matchDay.categoryId);

	if (!matches.length) throw new TypeError("No match found");
	matchDay.startDate = matches
		.reduce((time, match) => {
			const newTime = new Date(match.date_time);

			return time < newTime ? time : newTime;
		}, new Date(""))
		.toISOString();
	const startTime = new Date(matchDay.startDate).getTime() - 1_000 * 60 * 15;
	const date = Math.round(startTime / 1_000);

	await Promise.all([
		env.DB.prepare(
			"INSERT INTO MatchDays (day, categoryId, startDate) VALUES (?1, ?2, ?3)",
		)
			.bind(matchDay.day, matchDay.categoryId, matchDay.startDate)
			.run(),
		date - Date.now() / 1_000 > 1 &&
			rest.post(Routes.channelMessages(env.PREDICTIONS_CHANNEL), {
				body: {
					content: `<@&${env.PREDICTIONS_ROLE}>, potete inviare da ora i pronostici per la prossima giornata!\nPer farlo inviate il comando \`/predictions send\` e seguire le istruzioni o premete il pulsante qui in basso. Avete tempo fino a <t:${date}:F> (<t:${date}:R>)!`,
					components: [
						new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId(`predictions-${matchDay.day}-1-${startTime}`)
									.setEmoji({ name: "⚽" })
									.setLabel("Invia pronostici")
									.setStyle(ButtonStyle.Primary),
								new ButtonBuilder()
									.setCustomId(
										`predictions-start-${matchDayData.id_category}-${startTime}-${matchDay.day}`,
									)
									.setEmoji({ name: "▶️" })
									.setLabel("Inizia giornata")
									.setStyle(ButtonStyle.Primary),
							)
							.toJSON(),
					],
				} satisfies RESTPostAPIChannelMessageJSONBody,
			}),
	]);
};
