import { Colors, GuildTextBasedChannel } from "discord.js";
import { Document, MatchDay, User } from "../models";

export const sendPredictions = async (
	matchDay: Document<typeof MatchDay>,
	channel: GuildTextBasedChannel,
) => {
	const users = await User.find({
		predictions: { $exists: true, $type: "array", $ne: [] },
	});

	if (!users.length) return;
	for (let i = 0; i < users.length; i += 5) {
		const chunk = users.slice(i, i + 5);

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
						color: member?.displayColor ?? Colors.Blue,
						fields: matchDay.matches.map((match) => ({
							name: match.teams,
							value:
								user.predictions?.find(
									(predict) => predict.teams === match.teams,
								)?.prediction ?? "*Non presente*",
						})),
						thumbnail: {
							url: "https://img.legaseriea.it/vimages/64df31f4/Logo-SerieA_TIM_RGB.jpg",
						},
						title: `${matchDay.day}° Giornata Serie A TIM`,
					};
				}),
			),
		});
	}
};

export default sendPredictions;
