import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import {
	APIMessageComponentInteraction,
	APIUser,
	ButtonStyle,
	RESTPostAPIWebhookWithTokenJSONBody,
	Routes,
} from "discord-api-types/v10";
import {
	Env,
	closeMatchDay,
	getLiveEmbed,
	getPredictionsData,
	loadMatchDay,
	normalizeTeamName,
	resolveLeaderboard,
	rest,
} from ".";

export const startPredictions = async (
	env: Env,
	interaction: APIMessageComponentInteraction,
	day: number,
	categoryId: number,
) => {
	const [users, matches] = await getPredictionsData(env, categoryId);
	const promises: Promise<any>[] = [];
	const followupRoute = Routes.webhook(
		interaction.application_id,
		interaction.token,
	);
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
								data.predictions.find(
									(predict) => predict.matchId === match.match_id,
								)?.prediction ?? "*Non presente*",
						})),
						thumbnail: {
							url: "https://img.legaseriea.it/vimages/64df31f4/Logo-SerieA_TIM_RGB.jpg",
						},
						title: `${day}ª Giornata Serie A TIM`,
					};
				}),
			).then((embeds) =>
				rest.post(followupRoute, {
					body: { embeds } satisfies RESTPostAPIWebhookWithTokenJSONBody,
				}),
			),
		);
	}
	const finished = matches.every((match) => match.match_status === 2);
	const minute = Date.now() + 1000 * 60;

	if (finished) promises.push(closeMatchDay(env, leaderboard, matches, day));
	await Promise.all(promises);
	await Promise.all([
		rest.post(followupRoute, {
			body: {
				embeds: getLiveEmbed(users, matches, leaderboard, day, finished),
				components: finished
					? []
					: [
							new ActionRowBuilder<ButtonBuilder>()
								.addComponents(
									new ButtonBuilder()
										.setCustomId(
											`predictions-update-${categoryId}-${
												matches.some((match) => match.match_status === 1)
													? Date.now() + 1_000 * 60
													: Math.max(
															Date.parse(
																matches.find(
																	(match) => match.match_status === 0,
																)?.date_time ?? "",
															) || minute,
															minute,
														)
											}-${day}`,
										)
										.setEmoji({ name: "🔄" })
										.setLabel("Aggiorna")
										.setStyle(ButtonStyle.Primary),
								)
								.toJSON(),
						],
			} satisfies RESTPostAPIWebhookWithTokenJSONBody,
		}),
		loadMatchDay(env, categoryId),
	]);
};
