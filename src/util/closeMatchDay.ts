import { EmbedBuilder, Message } from "discord.js";
import { Document, MatchDay, User } from "../models";
import { createFinalLeaderboard, resolveLeaderboard } from "./liveScore";
import { MatchesData } from "./types";

export const closeMatchDay = (
	message: Message,
	users: Document<typeof User>[],
	matches: Extract<MatchesData, { success: true }>,
	matchDay: Document<typeof MatchDay>,
	embeds: EmbedBuilder[],
) => {
	const leaderboard = resolveLeaderboard(users, matches);
	const value = createFinalLeaderboard(leaderboard);
	const toEdit = [];

	matchDay.finished = true;
	for (const [user, matchPoints, dayPoints] of leaderboard) {
		(user.matchPointsHistory ??= new Array(matchDay.day - 1).fill(null)).push(
			matchPoints,
		);
		if (dayPoints) {
			user.dayPoints = (user.dayPoints ?? 0) + dayPoints;
		}
	}
	return Promise.all([
		message.edit({
			embeds: [
				embeds[0].setTitle(`Risultati Finali ${matchDay.day}° Giornata`),
				embeds[1]
					.setTitle(
						`⚽ Classifica Definitiva Pronostici ${matchDay.day}° Giornata`,
					)
					.setFields({
						name: "Classifica Generale",
						value,
					}),
			],
		}),
		matchDay.save(),
		...toEdit.map((user) => user.save()),
	]);
};
