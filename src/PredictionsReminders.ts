import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	ButtonStyle,
	RESTPostAPICurrentUserCreateDMChannelJSONBody,
	RESTPostAPICurrentUserCreateDMChannelResult,
	Routes,
	type APIUser,
	type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import ms from "ms";
import {
	getLiveEmbed,
	loadMatches,
	normalizeTeamName,
	resolveLeaderboard,
	rest,
	type Env,
	type Match,
	type MatchDayResponse,
	type Prediction,
	type ResolvedUser,
	type User,
} from "./util";

type Params = {
	matchDay?: { day: number; id: number };
};

export class PredictionsReminders extends WorkflowEntrypoint<Env, Params> {
	override async run(
		event: Readonly<WorkflowEvent<Params>>,
		step: WorkflowStep,
	) {
		const matchDay =
			event.payload.matchDay ??
			(await step.do("get match day", this.getMatchDay.bind(this)));

		if (!matchDay) {
			console.log("No match day available");
			return;
		}
		const startTime = await step.do(
			"get start time",
			this.getStartTime.bind(this, matchDay),
		);
		const diff = startTime - event.timestamp.getTime();

		if (diff > 12 * 60 * 60 * 1_000) {
			console.log(`Next match day is in ${ms(diff, { long: true })}`);
			return;
		}
		if (diff > 1_000) {
			const reminders = await step.do(
				"get prediction reminders",
				this.getReminders.bind(this, startTime),
			);

			rest.setToken(this.env.DISCORD_TOKEN);
			for (const [recipient_id, date] of reminders) {
				const channelId = await step.do(
					`create ${recipient_id} dm channel`,
					this.createDM.bind(this, recipient_id),
				);

				await step.sleepUntil(`${recipient_id} reminder`, date);
				await step.do<void>(
					`send ${recipient_id} reminder`,
					this.sendReminder.bind(this, channelId, matchDay, startTime),
				);
				await step.do<void>(
					`update ${recipient_id}`,
					this.updateUser.bind(this, recipient_id),
				);
			}
		}
		// TODO: Refactor this to a new workflow
		await step.sleepUntil("match day start", startTime);
		const matches = await step.do(
			"load matches",
			loadMatches.bind(null, matchDay.id),
		);
		const users = await step.do(
			"load predictions",
			this.loadPredictions.bind(this, matches),
		);
		const promises: Promise<void>[] = [];

		for (let i = 0; i < users.length; i += 5)
			promises.push(
				step.do<void>(
					`send chunk ${i / 5}`,
					this.sendEmbeds.bind(
						this,
						matchDay.day,
						matches,
						users.slice(i, i + 5),
					),
				),
			);
		await Promise.all(promises);
		await step.do<void>(
			"send message",
			this.sendMatchDayMessage.bind(this, users, matches, matchDay.day),
		);
	}

	// TODO: Check if alreaday started
	private async getMatchDay() {
		const matchDays = await fetch(
			`https://legaseriea.it/api/season/${this.env.SEASON_ID}/championship/A/matchday`,
		).then<MatchDayResponse>((res) => res.json());

		if (!matchDays.success) throw new Error(matchDays.message);
		const md = matchDays.data.find((d) => d.category_status === "TO BE PLAYED");

		return md && { day: Number(md.description), id: md.id_category };
	}

	private async getStartTime(day: { day: number; id: number }) {
		const matches = await loadMatches(day.id, 1);

		return Date.parse(matches[0]!.date_time) - 15 * 60 * 1000;
	}

	private async getReminders(startTime: number) {
		const { results } = await this.env.DB.prepare(
			`SELECT u.id, u.remindMinutes
				FROM Users u
				WHERE u.reminded = 0
				AND u.remindMinutes IS NOT NULL`,
		).all<Pick<User, "id" | "remindMinutes">>();

		return results
			.sort((a, b) => b.remindMinutes! - a.remindMinutes!)
			.map<
				[recipient_id: string, date: number]
			>((u) => [u.id, startTime - u.remindMinutes! * 60 * 1000]);
	}

	// TODO: Extract these to a RPC?
	private async createDM(recipient_id: string) {
		const { id } = (await rest.post(Routes.userChannels(), {
			body: {
				recipient_id,
			} satisfies RESTPostAPICurrentUserCreateDMChannelJSONBody,
		})) as RESTPostAPICurrentUserCreateDMChannelResult;

		return id;
	}

	private async sendReminder(
		channelId: string,
		matchDay: { day: number; id: number },
		startTime: number,
	) {
		await rest.post(Routes.channelMessages(channelId), {
			body: {
				content: "⚽ È l'ora di inviare i pronostici per la prossima giornata!",
				components: [
					new ActionRowBuilder<ButtonBuilder>()
						.addComponents(
							new ButtonBuilder()
								.setCustomId(
									`predictions-${Number(matchDay.day)}-1-${startTime}`,
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
			},
		});
	}

	private async updateUser(recipient_id: string) {
		await this.env.DB.prepare(`UPDATE Users SET reminded = 1 WHERE id = ?`)
			.bind(recipient_id)
			.run();
	}

	private async loadPredictions(matches: Match[]) {
		const [{ results: predictions }, { results: rawUsers }] =
			(await this.env.DB.batch([
				this.env.DB.prepare(
					`SELECT *
					FROM Predictions
					WHERE matchId IN (${Array(matches.length).fill("?").join(", ")})`,
				).bind(...matches.map((m) => m.match_id)),
				this.env.DB.prepare(`SELECT id, dayPoints, matchPointsHistory, match
					FROM Users
					ORDER BY dayPoints DESC`),
			])) as [
				D1Result<Prediction>,
				D1Result<
					Pick<User, "dayPoints" | "id" | "match" | "matchPointsHistory">
				>,
			];

		return rawUsers
			.map((user) => ({
				...user,
				predictions: predictions
					.filter((p) => p.userId === user.id)
					.map((p) => ({
						matchId: p.matchId,
						prediction: p.prediction,
					})),
			}))
			.filter((u) => u.predictions.length || u.dayPoints != null);
	}

	private async sendEmbeds(
		day: number,
		matches: Match[],
		users: ResolvedUser[],
	) {
		await Promise.all(
			users.map(async (data) => {
				const user = (await rest.get(Routes.user(data.id)).catch(() => {})) as
					| APIUser
					| undefined;

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
			rest.post(Routes.channelMessages(this.env.PREDICTIONS_CHANNEL), {
				body: { embeds } satisfies RESTPostAPIChannelMessageJSONBody,
			}),
		);
	}

	private async sendMatchDayMessage(
		users: ResolvedUser[],
		matches: Match[],
		day: number,
	) {
		await rest.post(Routes.channelMessages(this.env.PREDICTIONS_CHANNEL), {
			body: {
				embeds: getLiveEmbed(
					users,
					matches,
					resolveLeaderboard(users, matches),
					day,
				),
			} satisfies RESTPostAPIChannelMessageJSONBody,
		});
	}
}
