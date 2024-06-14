import {
	APIUser,
	Routes,
	type RESTPostAPIChannelMessageJSONBody,
	type RESTPostAPIChannelMessageResult,
} from "discord-api-types/v10";
import {
	Env,
	closeMatchDay,
	getLiveEmbeds,
	getPredictionsData,
	resolveLeaderboard,
	rest,
	type MatchData,
} from ".";

export const startPredictions = async (
	env: Env,
	matchDayId: string,
	matches: MatchData[],
) => {
	const users = await getPredictionsData(env, matches);
	const promises: Promise<any>[] = [];
	const route = Routes.channelMessages(env.PREDICTIONS_CHANNEL);
	const leaderboard = resolveLeaderboard(users, matches);
	const title = `${matches[0]!.round.metaData.type === "GROUP_STANDINGS" ? `Group stage - ${matches[0]!.matchday.longName}` : matches[0]!.round.metaData.name}`;

	for (let i = 0; i < users.length; i += 5) {
		const chunk = users.slice(i, i + 5);
		promises.push(
			Promise.all(
				chunk.map(async (data) => {
					const user = (await rest
						.get(Routes.user(data.id))
						.catch(() => {})) as APIUser | undefined;
					let { team } = data;

					for (const { awayTeam, homeTeam } of matches)
						if (awayTeam.id === team) {
							team = awayTeam.internationalName;
							break;
						} else if (homeTeam.id === team) {
							team = homeTeam.internationalName;
							break;
						}
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
						color: user?.accent_color ?? 0x004f9f,
						description: `Squadra favorita: ${team ? `**${team}**` : "*Non presente*"}`,
						fields: matches.map((match) => ({
							name: `${match.homeTeam.internationalName} - ${match.awayTeam.internationalName}`,
							value:
								data.predictions.find((predict) => predict.matchId === match.id)
									?.prediction ?? "*Non presente*",
						})),
						thumbnail: {
							url: "https://upload.wikimedia.org/wikipedia/it/f/f0/UEFA_Euro_2024_Logo.png",
						},
						title,
					};
				}),
			).then((embeds) =>
				rest.post(route, {
					body: { embeds } satisfies RESTPostAPIChannelMessageJSONBody,
				}),
			),
		);
	}
	const finished = matches.every((match) => match.status === "FINISHED");

	if (finished) promises.push(closeMatchDay(env, leaderboard, matches));
	await Promise.all(promises);
	const message = (await rest.post(route, {
		body: {
			embeds: getLiveEmbeds(users, matches, leaderboard, title, finished),
		} satisfies RESTPostAPIChannelMessageJSONBody,
	})) as RESTPostAPIChannelMessageResult;

	await env.KV.put(`matchDayMessage-${matchDayId}`, message.id);
};
