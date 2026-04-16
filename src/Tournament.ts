import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	ComponentType,
	MessageFlags,
	Routes,
	type APIMessageTopLevelComponent,
	type RESTGetAPIChannelMessageResult,
	type RESTPostAPIChannelMessageJSONBody,
	type RESTPostAPIChannelMessageResult,
} from "discord-api-types/v10";
import {
	DBMatchStatus,
	RegistrationMode,
	TournamentFlags,
	TournamentStatusFlags,
} from "./util/Constants";
import { rest } from "./util/globals";
import { ok } from "./util/node";
import normalizeError from "./util/normalizeError";
import { TimeUnit } from "./util/time";
import { createRegistrationMessage } from "./util/tournaments/createRegistrationMessage";
import { resolveWinner } from "./util/tournaments/resolveWinner";

export type Params = { id: number };

export class Tournament extends WorkflowEntrypoint<Env, Params> {
	private tournamentId!: number;

	override async run(
		event: Readonly<WorkflowEvent<Params>>,
		step: WorkflowStep,
	) {
		this.tournamentId = event.payload.id;
		const tournament = await step.do("Get tournament data", () =>
			this.env.DB.prepare(`SELECT * FROM Tournaments WHERE id = ?`)
				.bind(this.tournamentId)
				.first<Database.Tournament>(),
		);

		ok(tournament, "Tournament not found");
		await this.sendRegistrationMessage(tournament, step);
		await this.createBrackets(tournament, step);
		await this.createChannels(tournament, step);
	}

	private async sendRegistrationMessage(
		tournament: Readonly<Database.Tournament>,
		step: WorkflowStep,
	) {
		if (
			!tournament?.registrationStart ||
			!tournament.registrationChannel ||
			!tournament.registrationTemplateLink ||
			(tournament.registrationMode & RegistrationMode.Discord) === 0
		)
			return;
		if (
			tournament.registrationStart * TimeUnit.Second >
			Date.now() + TimeUnit.Second
		)
			await step.sleepUntil(
				"Wait for registration start",
				new Date(tournament.registrationStart * TimeUnit.Second),
			);

		try {
			const participantCount = await step.do("Get participant count", () =>
				this.env.DB.prepare(
					`
						SELECT COUNT(*) as participantCount
						FROM Participants
						WHERE tournamentId = ?
					`,
				)
					.bind(this.tournamentId)
					.first<number>("participantCount"),
			);
			if (!tournament.registrationMessage) {
				const id = await step.do<string>(
					"Send registration message",
					this.actuallySendMessage(
						tournament,
						tournament.registrationChannel,
						tournament.registrationTemplateLink,
						participantCount ?? 0,
					),
				);

				this.ctx.waitUntil(
					step.do<void>("Add message to database", () =>
						this.env.DB.prepare(
							`
								UPDATE Tournaments
								SET registrationMessage = ?1
								WHERE id = ?2
							`,
						)
							.bind(id, this.tournamentId)
							.run()
							.then(() => {}),
					),
				);
			}
		} catch (error) {
			this.sendError(
				step,
				tournament.logChannel,
				error,
				"Impossibile inviare il messaggio di iscrizione nel canale specificato!",
			);
		}
	}

	private actuallySendMessage =
		(
			tournament: Database.Tournament,
			channelId: string,
			registrationTemplateLink: string,
			registrationCount: number,
		) =>
		async () => {
			const { id } = (await rest.post(Routes.channelMessages(channelId), {
				body: await createRegistrationMessage(
					this.tournamentId,
					registrationTemplateLink,
					registrationCount,
					tournament.name,
					tournament.minPlayers,
				),
			})) as RESTPostAPIChannelMessageResult;

			return id;
		};

	private async createBrackets(
		tournament: Database.Tournament,
		step: WorkflowStep,
	) {
		if (
			!tournament.bracketsTime ||
			tournament.statusFlags & TournamentStatusFlags.BracketsCreated
		)
			return;
		if (
			tournament.bracketsTime * TimeUnit.Second >
			Date.now() + TimeUnit.Second
		)
			await step.sleepUntil(
				"Wait for brackets time",
				new Date(tournament.bracketsTime * TimeUnit.Second),
			);
		try {
			const participants = await step.do(
				"Get and shuffle participants",
				this.loadParticipants,
			);

			if (participants.length > 1)
				await step.do<void>(
					"Save participants",
					this.saveParticipants(participants),
				);
			this.log(step, tournament.logChannel, {
				type: ComponentType.TextDisplay,
				content: `## Brackets create!\nhttps://ms-bot.trombett.org/tournaments/${this.tournamentId}`,
			});
		} catch (error) {
			this.sendError(
				step,
				tournament.logChannel,
				error,
				"Impossibile creare le brackets!",
			);
		}
	}

	private saveParticipants =
		(participants: Pick<Database.Participant, "userId">[]) => async () => {
			const length = 2 ** (Math.ceil(Math.log2(participants.length)) - 1),
				query = this.env.DB.prepare(
					`INSERT INTO Matches (id, status, tournamentId, user1, user2) VALUES (?1, ?2, ?3, ?4, ?5)`,
				);

			await this.env.DB.batch(
				Array.from(
					{ length },
					this.createMatchQueries(length, participants, query),
				).concat(
					this.env.DB.prepare(
						`UPDATE Tournaments SET statusFlags = statusFlags | ?1 WHERE id = ?2`,
					).bind(TournamentStatusFlags.BracketsCreated, this.tournamentId),
				),
			);
		};

	private createMatchQueries =
		(
			length: number,
			participants: Pick<Database.Participant, "userId">[],
			query: D1PreparedStatement,
		) =>
		(_: unknown, i: number) => {
			const match: Database.Match = {
				id: i + length - 1,
				status: 0,
				tournamentId: this.tournamentId,
				user1: participants[i]!.userId,
				user2: participants[i + length]?.userId ?? null,
			};

			if (!match.user2) match.status = DBMatchStatus.Default;
			return query.bind(
				match.id,
				match.status,
				match.tournamentId,
				match.user1,
				match.user2,
			);
		};

	private loadParticipants = async () => {
		const { results } = await this.env.DB.prepare(
			`SELECT userId FROM Participants WHERE tournamentId = ?`,
		)
			.bind(this.tournamentId)
			.run<Pick<Database.Participant, "userId">>();
		let currentIndex = results.length;

		if (currentIndex <= 1) return [];
		while (currentIndex != 0) {
			const randomIndex = Math.floor(Math.random() * currentIndex--);

			[results[currentIndex], results[randomIndex]] = [
				results[randomIndex]!,
				results[currentIndex]!,
			];
		}
		return results;
	};

	private createChannels = async (
		tournament: Database.Tournament,
		step: WorkflowStep,
	) => {
		if (
			!tournament.channelsTime ||
			tournament.statusFlags & TournamentStatusFlags.Finished
		)
			return;
		if (
			tournament.channelsTime * TimeUnit.Second >
			Date.now() + TimeUnit.Second
		)
			await step.sleepUntil(
				"Wait for channels time",
				new Date(tournament.channelsTime * TimeUnit.Second),
			);
		const participantCount = await step.do("Get new participant count", () =>
			this.env.DB.prepare(
				`
					SELECT COUNT(*) as participantCount
					FROM Participants
					WHERE tournamentId = ?
				`,
			)
				.bind(this.tournamentId)
				.first<number>("participantCount"),
		);

		if (!participantCount || participantCount < 2) return;
		for (
			let round =
				tournament.currentRound ?? Math.ceil(Math.log2(participantCount)) - 1;
			round >= 0;
			round--
		) {
			const [matches, message] = await Promise.all([
				this.createRoundAndDeleteChannels(
					step,
					round,
					tournament.logChannel,
					tournament.flags,
				),
				tournament.matchMessageLink &&
					step.do(
						`Fetch message for round ${round}`,
						this.fetchMatchMessage(tournament.matchMessageLink),
					),
				step.do<void>(`Set current round to ${round}`, () =>
					this.env.DB.prepare(
						`UPDATE Tournaments SET currentRound = ?1 WHERE id = ?2`,
					)
						.bind(round, this.tournamentId)
						.run()
						.then(() => {}),
				),
			]);

			if (matches.length)
				await step.do<void>(
					`Create channels workflows for round ${round}`,
					() =>
						this.env.CHANNELS.createBatch(
							matches
								.reduce<MatchWithPlayers[][]>((arr, v) => {
									if (!arr.length || arr.at(-1)!.length >= 16) arr.push([]);
									arr.at(-1)!.push(v);
									return arr;
								}, [])
								.map((matches) => ({
									params: { ...message, matches, tournament },
								})),
						).then(() => {}),
				);
			await step.waitForEvent(`Wait for round ${round} to finish`, {
				type: `round-${round}`,
			});
		}
		await step.do<void>("Finish tournament", () =>
			this.env.DB.prepare(
				`UPDATE Tournaments SET statusFlags = statusFlags | ?1 WHERE id = ?2`,
			)
				.bind(TournamentStatusFlags.Finished, this.tournamentId)
				.run()
				.then(() => {}),
		);
	};

	private createRoundAndDeleteChannels = async (
		step: WorkflowStep,
		round: number,
		logChannel: string,
		flags: number,
	) => {
		const oldMatches = await step.do(
			`Get existing matches for round ${round}`,
			this.getMatches(round + 1),
		);
		const [matches] = await Promise.all([
			step.do(`Create round ${round}`, this.createRound(round, oldMatches)),
			flags & TournamentFlags.AutoDeleteChannels &&
				this.env.DELETE_CHANNELS.createBatch(
					oldMatches
						.filter(
							(
								v,
							): v is typeof v & {
								channelId: NonNullable<(typeof v)["channelId"]>;
							} =>
								v.channelId != null &&
								Math.floor(Math.log2(v.id + 1)) === round + 1,
						)
						.reduce<string[][]>((arr, v) => {
							if (!arr.length || arr.at(-1)!.length >= 16) arr.push([]);
							arr.at(-1)!.push(v.channelId);
							return arr;
						}, [])
						.map((channels) => ({ params: { channels, logChannel } })),
				)
					.then(() => {})
					.catch(console.error),
		]);

		return matches;
	};

	private fetchMatchMessage = (matchMessageLink: string) => async () => {
		const message = (await rest.get(
			Routes.channelMessage(
				...(matchMessageLink.split("/") as [
					channelId: string,
					messageId: string,
				]),
			),
		)) as RESTGetAPIChannelMessageResult;

		return {
			content: message.content,
			attachments: message.attachments.map((a) => ({
				description: a.description,
				spoiler: a.filename.startsWith("SPOILER_"),
				media: { url: a.url },
			})),
		};
	};

	private createRound =
		(round: number, oldMatches: MatchWithPlayers[]) => async () => {
			const resolvedOldMatches: MatchWithPlayers[] = [];
			for (const match of oldMatches) resolvedOldMatches[match.id] = match;
			const matches = Array.from(
				{ length: 2 ** round },
				(_, k): MatchWithPlayers | undefined => {
					const start = 2 ** (round + 1) + k * 2 - 1;
					let [a, b] = resolvedOldMatches
						.slice(start, start + 2)
						.map((v) => ({ ...v, winner: resolveWinner(v) }));

					if (!a) {
						if (!b) return resolvedOldMatches[2 ** round + k - 1];
						[a, b] = [b, a];
					}
					if (a.winner === undefined || (b && b?.winner === undefined)) return;
					if (!a.winner) {
						if (!b?.winner) return;
						[a, b] = [b, a];
					}

					return {
						id: 2 ** round + k - 1,
						status: b?.winner ? DBMatchStatus.Playing : DBMatchStatus.Default,
						tournamentId: this.tournamentId,
						user1: a.winner!,
						user2: b?.winner ?? null,
						user1Name: a.winner === a.user1 ? a.user1Name : a.user2Name,
						user2Name:
							b ?
								b.winner === b.user1 ?
									b.user1Name
								:	b.user2Name
							:	null,
						user1Tag: a.winner === a.user1 ? a.user1Tag : a.user2Tag,
						user2Tag:
							b ?
								b.winner === b.user1 ?
									b.user1Tag
								:	b.user2Tag
							:	null,
					};
				},
			).filter(
				(v): v is NonNullable<typeof v> =>
					v != null &&
					(!resolvedOldMatches[v.id] ||
						v === resolvedOldMatches[v.id] ||
						v.user1 != resolvedOldMatches[v.id]!.user1 ||
						v.user2 != resolvedOldMatches[v.id]!.user2),
			);
			const query = this.env.DB.prepare(
				`
					INSERT INTO Matches (id, status, tournamentId, user1, user2) VALUES (?1, ?2, ?3, ?4, ?5)
					ON CONFLICT(id, tournamentId) DO
					UPDATE SET
						status		=	excluded.status,
						user1		=	excluded.user1,
						user2		=	excluded.user2,
						result1		=	NULL,
						result2		=	NULL,
						channelId	=	NULL
					WHERE user1 IS NOT excluded.user1 OR user2 IS NOT excluded.user2
					RETURNING channelId
				`,
			);
			const existing = await this.env.DB.batch<
				Partial<Pick<Database.Match, "channelId">>
			>(
				matches.map((m) =>
					query.bind(m.id, m.status, m.tournamentId, m.user1, m.user2),
				),
			);

			return matches.filter(
				(m, i) => m.user2 && !existing[i]?.results[0]?.channelId,
			);
		};

	private getMatches = (round: number) => async () => {
		const { results } = await this.env.DB.prepare(
			`
				SELECT m.*,
					p1.tag		AS	user1Tag,
					sp1.name	AS	user1Name,
					p2.tag		AS	user2Tag,
					sp2.name	AS	user2Name
				FROM Matches m
					LEFT JOIN Participants p1 ON p1.tournamentId = m.tournamentId
					AND p1.userId = m.user1
					LEFT JOIN SupercellPlayers sp1 ON sp1.userId = p1.userId
					AND sp1.tag = p1.tag
					LEFT JOIN Participants p2 ON p2.tournamentId = m.tournamentId
					AND p2.userId = m.user2
					LEFT JOIN SupercellPlayers sp2 ON sp2.userId = p2.userId
					AND sp2.tag = p2.tag
				WHERE m.tournamentId = ?1 AND m.id >= ?2 AND m.id <= ?3
				ORDER BY m.id
			`,
		)
			.bind(this.tournamentId, 2 ** (round - 1) - 1, 2 ** (round + 1) - 2)
			.run<MatchWithPlayers>();

		return results;
	};

	private sendError = (
		step: WorkflowStep,
		channelId: string,
		error: unknown,
		message?: string,
	) => {
		const id = crypto.randomUUID();

		error = normalizeError(error);
		this.ctx.waitUntil(
			step.do<void>(
				`Report error ${id} in logs channel`,
				{ retries: { limit: 1, delay: 5_000 } },
				() =>
					rest
						.post(Routes.channelMessages(channelId), {
							body: {
								flags: MessageFlags.IsComponentsV2,
								components: [
									{
										type: ComponentType.Container,
										accent_color: 0xff0000,
										components: [
											{
												type: ComponentType.TextDisplay,
												content: `${message ? `### ${message}\n` : ""}\`\`\`\n${(error as Error).stack?.slice(0, 3952 - (message ? message.length + 5 : 0))}\n\`\`\`\n-# ${id}`,
											},
										],
									},
								],
							} satisfies RESTPostAPIChannelMessageJSONBody,
						})
						.then(() => {}),
			),
		);
	};

	private log = (
		step: WorkflowStep,
		channelId: string,
		...components: APIMessageTopLevelComponent[]
	) =>
		this.ctx.waitUntil(
			step.do<void>(`Send message in logs channel ${crypto.randomUUID()}`, () =>
				rest
					.post(Routes.channelMessages(channelId), {
						body: {
							flags: MessageFlags.IsComponentsV2,
							components,
						} satisfies RESTPostAPIChannelMessageJSONBody,
					})
					.then(() => {}),
			),
		);
}
