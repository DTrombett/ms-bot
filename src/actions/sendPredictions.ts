import { Colors } from "discord.js";
import { env } from "node:process";
import { MatchDay, User } from "../models";
import { CustomClient } from "../util";

export const sendPredictions = async (client: CustomClient, day: number) => {
	const channelId = env.PREDICTIONS_CHANNEL;

	if (channelId === undefined) {
		CustomClient.printToStderr("Predictions channel not set!");
		return;
	}
	const [users, matchDay] = await Promise.all([
		User.find({
			predictions: { $exists: true, $type: "array", $ne: [] },
		}),
		MatchDay.findOne({ day }),
	]);

	if (!matchDay) {
		CustomClient.printToStderr(`Invalid match day: ${day}`);
		return;
	}
	for (let i = 0; i < users.length; i += 5) {
		const chunk = users.slice(i, i + 5);
		const channel = client.channels.cache.get(channelId);

		// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
		if (!channel?.isTextBased() || channel.isDMBased()) {
			CustomClient.printToStderr("Invalid predictions channel!");
			return;
		}
		await channel.send({
			embeds: await Promise.all(
				chunk.map(async (user) => {
					const member = await channel.guild.members
						.fetch(user._id)
						.catch(() => {});

					return {
						author: {
							name: member?.displayName ?? user._id,
							icon_url: member?.displayAvatarURL({ extension: "png" }),
						},
						color: Colors.Blue,
						fields: matchDay.matches.map((match) => ({
							name: match.teams,
							value:
								user.predictions?.find(
									(predict) => predict.teams === match.teams,
								)?.prediction ?? "*Non presente*",
						})),
						thumbnail: {
							url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Serie_A_logo_2022.svg/1200px-Serie_A_logo_2022.svg.png",
						},
						title: `${day}° Giornata Serie A TIM`,
						url: "https://legaseriea.it/it/serie-a",
					};
				}),
			),
		});
	}
};
