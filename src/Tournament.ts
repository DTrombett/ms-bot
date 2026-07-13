import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import {
	ButtonStyle,
	ComponentType,
	MessageFlags,
	Routes,
	type APIComponentInContainer,
	type APIMessageTopLevelComponent,
	type RESTGetAPIChannelMessageResult,
	type RESTPostAPIChannelMessageJSONBody,
	type RESTPostAPIChannelMessageResult,
} from "discord-api-types/v10";
import { shuffleArray } from "./util/arrays";
import {
	DBMatchStatus,
	QueueMessageType,
	RegistrationMode,
	TournamentFlags,
	TournamentRoundMode,
	TournamentStatusFlags,
} from "./util/Constants";
import { rest } from "./util/globals";
import { ok } from "./util/node";
import normalizeError from "./util/normalizeError";
import { template } from "./util/strings";
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
		try {
			this.tournamentId = event.payload.id;
			// Don't use a step so the data is updated every time the workflow wakes up
			const tournament = await this.env.DB.prepare(
				`SELECT * FROM Tournaments WHERE id = ?`,
			)
				.bind(this.tournamentId)
				.first<Database.Tournament>();

			ok(tournament, "Tournament not found");
			await this.sendRegistrationMessage(tournament, step);
			await this.closeRegistrations(tournament, step);
			await this.createBrackets(tournament, step);
			await this.createChannels(tournament, step);
		} catch (err) {
			this.sendError(
				step,
				this.env.STATUS_CHANNEL,
				`Errore fatale durante la gestione del torneo ${event.payload.id}`,
				err,
			);
			throw err;
		}
	}

	private async sendRegistrationMessage(
		tournament: Database.Tournament,
		step: WorkflowStep,
	) {
		if (
			!tournament?.registrationStart ||
			!tournament.registrationChannel ||
			!tournament.registrationTemplateLink ||
			tournament.registrationMessage ||
			(tournament.registrationMode & RegistrationMode.Discord) === 0
		)
			return;
		try {
			if (
				tournament.registrationStart * TimeUnit.Second >
				Date.now() + TimeUnit.Second
			) {
				await step.sleepUntil(
					"Wait for registration start",
					new Date(tournament.registrationStart * TimeUnit.Second),
				);
				tournament.participantCount = (await step.do(
					"Get initial participant count",
					this.getParticipantCount,
				))!;
			}
			tournament.registrationMessage = await step.do<string>(
				"Send registration message",
				this.actuallySendMessage(
					tournament,
					tournament.registrationChannel,
					tournament.registrationTemplateLink,
				),
			);
			await step.do<void>("Add message to database", () =>
				this.env.DB.prepare(
					`UPDATE Tournaments SET registrationMessage = ?1 WHERE id = ?2`,
				)
					.bind(tournament.registrationMessage, this.tournamentId)
					.run()
					.then(() => {}),
			);
		} catch (error) {
			this.sendError(
				step,
				tournament.logChannel,
				"Impossibile inviare il messaggio di iscrizione nel canale specificato!",
				error,
			);
		}
	}

	private async closeRegistrations(
		tournament: Database.Tournament,
		step: WorkflowStep,
	) {
		if (
			!tournament?.registrationEnd ||
			!tournament.registrationChannel ||
			!tournament.registrationMessage ||
			(tournament.registrationMode & RegistrationMode.Discord) === 0
		)
			return;
		try {
			if (
				tournament.registrationEnd * TimeUnit.Second >
				Date.now() + TimeUnit.Second
			) {
				await step.sleepUntil(
					"Wait for registration end",
					new Date(tournament.registrationEnd * TimeUnit.Second),
				);
				tournament.participantCount = (await step.do(
					"Get updated participant count",
					this.getParticipantCount,
				))!;
			}
			await step.do<void>("Disable registration message", () =>
				this.env.QUEUE.send({
					t: QueueMessageType.TournamentMessageEdit,
					d: { id: this.tournamentId },
				} satisfies QueueMessage).then(() => {}),
			);
		} catch (error) {
			this.sendError(
				step,
				tournament.logChannel,
				"Impossibile disabilitare il messaggio di iscrizione!",
				error,
			);
		}
	}

	private actuallySendMessage =
		(
			tournament: Database.Tournament,
			channelId: string,
			registrationTemplateLink: string,
		) =>
		async () => {
			const { id } = (await rest.post(Routes.channelMessages(channelId), {
				body: await createRegistrationMessage(
					registrationTemplateLink,
					tournament,
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

			tournament.participantCount = participants.length;
			if (participants.length < (tournament.minPlayers ?? 0))
				await step.do(
					"Participants count not satisfied",
					{ retries: { limit: 0, delay: 0 } },
					Promise.reject.bind<PromiseConstructor, [Error], [], Promise<never>>(
						Promise,
						new NonRetryableError(
							`Minimo partecipanti non soddisfatto: ${participants.length} < ${tournament.minPlayers}`,
						),
					),
				);
			if (participants.length > 1)
				await step.do<void>(
					"Save participants",
					this.saveParticipants(participants),
				);
			this.log(step, tournament.logChannel, "Brackets create", {
				type: ComponentType.TextDisplay,
				content: `## Brackets create!\nhttps://ms-bot.trombett.org/tournaments/${this.tournamentId}/brackets`,
			});
		} catch (error) {
			this.sendError(
				step,
				tournament.logChannel,
				"Impossibile creare le brackets!",
				error,
			);
		}
	}

	private saveParticipants =
		(participants: Pick<Database.Participant, "userId">[]) => async () => {
			const length = 2 ** (Math.ceil(Math.log2(participants.length)) - 1),
				query = this.env.DB.prepare(
					`
						INSERT INTO Matches (id, status, tournamentId, user1, user2)
						VALUES (?1, ?2, ?3, ?4, ?5)
					`,
				);

			await this.env.DB.batch(
				// Shuffle so that bye matches are not only at the end
				shuffleArray(
					Array.from(
						{ length },
						(_, k): Pick<Database.Match, "user1" | "user2"> => ({
							user1: participants[k]!.userId,
							user2: participants[k + length]?.userId ?? null,
						}),
					),
				)
					.map((value, index) =>
						query.bind(
							index + length - 1,
							value.user2 ? DBMatchStatus.ToBePlayed : DBMatchStatus.Default,
							this.tournamentId,
							value.user1,
							value.user2,
						),
					)
					.concat(
						this.env.DB.prepare(
							`
								UPDATE Tournaments
								SET statusFlags = statusFlags | ?1
								WHERE id = ?2
							`,
						).bind(TournamentStatusFlags.BracketsCreated, this.tournamentId),
					),
			);
		};

	private loadParticipants = async () => {
		const { results } = await this.env.DB.prepare(
			`SELECT userId FROM Participants WHERE tournamentId = ?`,
		)
			.bind(this.tournamentId)
			.run<Pick<Database.Participant, "userId">>();

		return shuffleArray(results);
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
		) {
			await step.sleepUntil(
				"Wait for channels time",
				new Date(tournament.channelsTime * TimeUnit.Second),
			);
			tournament.participantCount = (await step.do(
				"Get final participant count",
				this.getParticipantCount,
			))!;
		}
		if (!tournament.participantCount || tournament.participantCount < 2) return;
		let skip = false;
		if (tournament.currentRound == null) {
			tournament.currentRound = Math.ceil(
				Math.log2(tournament.participantCount),
			);
			if (tournament.roundType === TournamentRoundMode.Manual)
				await step.do<void>("Signal tournament ready to start", () =>
					rest
						.post(Routes.channelMessages(tournament.logChannel), {
							body: {
								content: "Il torneo è pronto per iniziare!",
								components: [
									{
										type: ComponentType.ActionRow,
										components: [
											{
												type: ComponentType.Button,
												custom_id: `tournament-ava-${this.tournamentId}-${tournament.currentRound!}`,
												style: ButtonStyle.Success,
												emoji: { name: "🚀" },
												label: "Inizia",
											},
										],
									},
								],
							} satisfies RESTPostAPIChannelMessageJSONBody,
						})
						.then(() => {}),
				);
			else skip = true;
		}
		for (
			tournament.currentRound--;
			tournament.currentRound >= 0;
			tournament.currentRound--
		) {
			if (skip) skip = false;
			else
				await step.waitForEvent(
					`Wait for round ${tournament.currentRound} to start`,
					{ type: `round-${tournament.currentRound + 1}` },
				);
			if (!tournament.matchMessageLink) {
				this.sendError(
					step,
					tournament.logChannel,
					"Non è stato impostato il link al messaggio da mandare nei canali!",
				);
				throw new Error("Missing match message link");
			}
			const [matches, message] = await Promise.all([
				this.createRoundAndDeleteChannels(
					step,
					tournament.currentRound,
					tournament.logChannel,
					tournament.flags,
				),
				step.do(
					`Fetch message for round ${tournament.currentRound}`,
					this.fetchMatchMessage(tournament.matchMessageLink),
				),
			]);

			if (matches.length)
				await step.do<void>(
					`Create channels workflows for round ${tournament.currentRound}`,
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
			await step.do<void>(
				`Set current round to ${tournament.currentRound}`,
				() =>
					this.env.DB.prepare(
						`UPDATE Tournaments SET currentRound = ?1 WHERE id = ?2`,
					)
						.bind(tournament.currentRound, this.tournamentId)
						.run()
						.then(() => {}),
			);
		}
		await step.waitForEvent("Wait for tournament to finish", {
			type: "round-0",
		});
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
		const batch = oldMatches
			.filter(
				(
					v,
				): v is typeof v & {
					channelId: NonNullable<(typeof v)["channelId"]>;
				} =>
					v.channelId != null && Math.floor(Math.log2(v.id + 1)) === round + 1,
			)
			.reduce<string[][]>((arr, v) => {
				if (!arr.length || arr.at(-1)!.length >= 16) arr.push([]);
				arr.at(-1)!.push(v.channelId);
				return arr;
			}, [])
			.map((channels) => ({ params: { channels, logChannel } }));
		const [matches] = await Promise.all([
			step.do(`Create round ${round}`, this.createRound(round, oldMatches)),
			flags & TournamentFlags.AutoDeleteChannels &&
				batch.length &&
				step
					.do(`Delete channels from round ${round + 1}`, () =>
						this.env.DELETE_CHANNELS.createBatch(batch).then(() => {}),
					)
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
		message?: string,
		error?: unknown,
	) => {
		const id = crypto.randomUUID();
		const newError = error == null ? null : normalizeError(error);
		const component: APIComponentInContainer = {
			type: ComponentType.TextDisplay,
			content: template`
				${message}### ${message}
				${newError}\`\`\`\n${(newError?.stack ?? newError?.toString())?.slice(
					0,
					3952 - (message ? message.length + 5 : 0),
				)}\n\`\`\`
				-# ${id}
			`,
		};

		this.ctx.waitUntil(
			step.do(
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
										components: [component],
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
		name: string,
		...components: APIMessageTopLevelComponent[]
	) =>
		this.ctx.waitUntil(
			step.do<void>(name, () =>
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

	private getParticipantCount = () =>
		this.env.DB.prepare(`SELECT participantCount FROM Tournaments WHERE id = ?`)
			.bind(this.tournamentId)
			.first<number>("participantCount") as Promise<number>;
}
