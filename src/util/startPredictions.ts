import {
	APIUser,
	Routes,
	type RESTPostAPIChannelMessageJSONBody,
	type RESTPostAPIChannelMessageResult,
} from "discord-api-types/v10";
import {
	Env,
	MatchStatus,
	getLiveEmbed,
	getPredictionsData,
	loadMatchDay,
	normalizeTeamName,
	resolveLeaderboard,
	rest,
} from ".";

export const startPredictions = async (
	env: Env,
	day: number,
	categoryId: number,
) => {
	const [users, matches] = await getPredictionsData(env, categoryId);

	if (matches.every((match) => match.match_status === MatchStatus.Finished)) {
		console.log("Match day is already finished!", { day, categoryId });
		return null;
	}
	const promises: Promise<any>[] = [];
	const followupRoute = Routes.channelMessages(env.PREDICTIONS_CHANNEL);
	const leaderboard = resolveLeaderboard(users, matches);

	for (let i = 0; i < users.length; i += 5) {
		const chunk = users.slice(i, i + 5);

		promises.push(
			Promise.all(
				chunk.map(async (data) => {
					const user = (await rest
						.get(Routes.user(data.id))
						.catch(() => {})) as APIUser | undefined;

					return {
						author: {
							name: user?.global_name ?? user?.username ?? data.id,
							icon_url:
								user &&
								(user.avatar == null
									? rest.cdn.defaultAvatar(
											user.discriminator === "0"
												? Number(BigInt(user.id) >> 22n) % 6
												: Number(user.discriminator) % 5,
										)
									: rest.cdn.avatar(user.id, user.avatar, {
											size: 4096,
											extension: "png",
										})),
						},
						color: user?.accent_color ?? 0x3498db,
						fields: matches.map((match) => ({
							name: [match.home_team_name, match.away_team_name]
								.map(normalizeTeamName)
								.join(" - "),
							value:
								(data.match === match.match_id ? "⭐ " : "") +
								(data.predictions.find(
									(predict) => predict.matchId === match.match_id,
								)?.prediction ?? "*Non presente*"),
						})),
						thumbnail: {
							url: "https://img.legaseriea.it/vimages/6685b340/SerieA_ENILIVE_RGB.jpg",
						},
						title: `${day}ª Giornata Serie A Enilive`,
					};
				}),
			).then((embeds) =>
				rest.post(followupRoute, {
					body: { embeds } satisfies RESTPostAPIChannelMessageJSONBody,
				}),
			),
		);
	}
	const match = matches.find(
		(m) =>
			m.match_status === MatchStatus.Live ||
			m.match_status === MatchStatus.ToBePlayed,
	);

	await Promise.all(promises);
	const [{ id }] = await Promise.all([
		rest.post(followupRoute, {
			body: {
				embeds: getLiveEmbed(users, matches, leaderboard, day),
			} satisfies RESTPostAPIChannelMessageJSONBody,
		}) as Promise<RESTPostAPIChannelMessageResult>,
		loadMatchDay(env, categoryId),
	]);

	return {
		categoryId: categoryId.toString(),
		messageId: id,
		nextUpdate:
			match?.match_status === MatchStatus.ToBePlayed
				? Date.parse(match.date_time).toString()
				: undefined,
	};
};
