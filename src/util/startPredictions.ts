import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import {
	APIInteractionResponseChannelMessageWithSource,
	APIInteractionResponseDeferredChannelMessageWithSource,
	APIInteractionResponseDeferredMessageUpdate,
	APIInteractionResponseUpdateMessage,
	APIMessageComponentInteraction,
	APIModalInteractionResponse,
	APIUser,
	ButtonStyle,
	InteractionResponseType,
	RESTPostAPIWebhookWithTokenJSONBody,
	Routes,
} from "discord-api-types/v10";
import {
	Env,
	closeMatchDay,
	getLiveEmbed,
	normalizeTeamName,
	prepareMatchDayData,
	resolveLeaderboard,
} from ".";

export const startPredictions = async (
	api: REST,
	env: Env,
	interaction: APIMessageComponentInteraction,
	day: number,
	categoryId: number,
	reply: (
		result:
			| APIInteractionResponseChannelMessageWithSource
			| APIInteractionResponseDeferredChannelMessageWithSource
			| APIInteractionResponseDeferredMessageUpdate
			| APIInteractionResponseUpdateMessage
			| APIModalInteractionResponse,
	) => void,
) => {
	const [users, matches] = await prepareMatchDayData(env, categoryId);
	const promises: Promise<any>[] = [];
	const followupRoute = Routes.webhook(
		interaction.application_id,
		interaction.token,
	);
	const finished = matches.data.every((match) => match.match_status === 2);
	const leaderboard = resolveLeaderboard(users, matches);

	if (finished) promises.push(closeMatchDay(api, env, leaderboard, day));
	for (let i = 0; i < users.length; i += 5) {
		const chunk = users.slice(i, i + 5);

		promises.push(
			Promise.all(
				chunk.map(async (data) => {
					const user = (await api.get(Routes.user(data.id)).catch(() => {})) as
						| APIUser
						| undefined;

					return {
						author: {
							name: user?.global_name ?? user?.username ?? data.id,
							icon_url:
								user &&
								(user.avatar == null
									? api.cdn.defaultAvatar(
											user.discriminator === "0"
												? Number(BigInt(user.id) >> 22n) % 6
												: Number(user.discriminator) % 5,
										)
									: api.cdn.avatar(user.id, user.avatar, {
											size: 4096,
											extension: "png",
										})),
						},
						color: user?.accent_color ?? 0x3498db,
						fields: matches.data.map((match) => ({
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
				api.post(followupRoute, {
					body: { embeds } satisfies RESTPostAPIWebhookWithTokenJSONBody,
				}),
			),
		);
	}
	reply({
		type: InteractionResponseType.UpdateMessage,
		data: {
			content: `## ${day}ª Giornata iniziata!\n\nSegui i risultati live e controlla i pronostici degli altri utenti qui in basso.`,
			components: [],
		},
	});
	await Promise.all(promises);
	await api.post(followupRoute, {
		body: {
			embeds: getLiveEmbed(users, matches, leaderboard, day, finished),
			components: finished
				? undefined
				: [
						new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId(
										`predictions-update-${categoryId}-${
											matches.data.some((match) => match.match_status === 1)
												? Date.now() + 1_000 * 60
												: Math.max(
														new Date(
															matches.data.find(
																(match) => match.match_status === 0,
															)?.date_time as number | string,
														).getTime(),
														Date.now() + 1_000 * 60,
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
	});
};
