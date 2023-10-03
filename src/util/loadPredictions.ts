import { GuildTextBasedChannel } from "discord.js";
import { env } from "node:process";
import { setTimeout } from "node:timers/promises";
import { Document, MatchDay } from "../models";
import CustomClient from "./CustomClient";
import liveScore from "./liveScore";
import loadMatchDay from "./loadMatchDay";
import loadMatches from "./loadMatches";
import { printToStdout } from "./logger";
import sendPredictions from "./sendPredictions";
import { MatchesData } from "./types";

const startDay = async (
	client: CustomClient,
	matches: Extract<MatchesData, { success: true }>,
	matchDay: Document<typeof MatchDay>,
	channel: GuildTextBasedChannel,
): Promise<never> => {
	if (matchDay.finished) {
		const delay =
			new Date(matches.data.at(-1)!.date_time).getTime() +
			1000 * 60 * 60 * 10 -
			Date.now();

		if (delay > 0) {
			printToStdout(
				`[${new Date().toISOString()}] Match Day finished! Waiting until 10 hours after the start of the last match.`,
			);
			await setTimeout(delay, undefined, { ref: false });
		}
		printToStdout(`[${new Date().toISOString()}] Loading new match day.`);
		matchDay = await loadMatchDay(client, channel);
		matches = await loadMatches(matchDay._id);
	}
	const startTime = new Date(matches.data[0].date_time).getTime();

	if (!matchDay.predictionsSent) {
		const delay = startTime - Date.now() - 1000 * 60 * 15;

		if (delay > 0) {
			printToStdout(
				`[${new Date().toISOString()}] Waiting until 15 minutes before the start of the first match to send the predictions.`,
			);
			await setTimeout(delay, undefined, {
				ref: false,
			});
		}
		printToStdout(`[${new Date().toISOString()}] Sending predictions.`);
		await sendPredictions(matchDay, channel);
		matchDay.predictionsSent = true;
		await matchDay.save();
	}
	const delay = startTime - Date.now();

	if (delay > 0) {
		printToStdout(
			`[${new Date().toISOString()}] Waiting for the start of the first match.`,
		);
		await setTimeout(delay, undefined, { ref: false });
	}
	printToStdout(`[${new Date().toISOString()}] Starting live scores.`);
	await liveScore(matchDay, channel);
	return startDay(client, matches, matchDay, channel);
};

export const loadPredictions = async (client: CustomClient) => {
	if (typeof env.PREDICTIONS_CHANNEL === "undefined")
		throw new TypeError("Predictions channel not set!");
	const channel = await client.channels.fetch(env.PREDICTIONS_CHANNEL);

	if (!channel?.isTextBased() || channel.isDMBased())
		throw new TypeError("Invalid predictions channel!");
	const matchDay =
		(await MatchDay.findOne({}).sort("-day")) ??
		(await loadMatchDay(client, channel));

	await startDay(client, await loadMatches(matchDay._id), matchDay, channel);
};
