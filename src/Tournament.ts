import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	ComponentType,
	MessageFlags,
	Routes,
	type RESTPatchAPIChannelMessageResult,
	type RESTPostAPIChannelMessageJSONBody,
	type RESTPostAPIChannelMessageResult,
} from "discord-api-types/v10";
import {
	DBMatchStatus,
	RegistrationMode,
	TournamentFlags,
} from "./util/Constants";
import { rest } from "./util/globals";
import { ok } from "./util/node";
import normalizeError from "./util/normalizeError";
import { TimeUnit } from "./util/time";
import { createRegistrationMessage } from "./util/tournaments/createRegistrationMessage";

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
			const id = await step.do<string>(
				"Send registration message",
				this.actuallySendMessage(
					tournament,
					tournament.registrationChannel,
					tournament.registrationTemplateLink,
					participantCount ?? 0,
				),
			);

			if (!tournament.registrationMessage)
				this.ctx.waitUntil(
					step.do<void>("Update database", () =>
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
		} catch (error) {
			this.sendError(
				step,
				tournament.logChannel,
				error,
				"Impossibile inviare il messaggio di iscrizione nel canale specificato",
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
			const { id } = (await rest[
				tournament.registrationMessage ? "patch" : "post"
			](
				tournament.registrationMessage ?
					Routes.channelMessage(channelId, tournament.registrationMessage)
				:	Routes.channelMessages(channelId),
				{
					body: await createRegistrationMessage(
						this.tournamentId,
						registrationTemplateLink,
						registrationCount,
						tournament.name,
						tournament.minPlayers,
					),
				},
			)) as
				| RESTPostAPIChannelMessageResult
				// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
				| RESTPatchAPIChannelMessageResult;

			return id;
		};

	private async createBrackets(
		tournament: Database.Tournament,
		step: WorkflowStep,
	) {
		if (
			!tournament.bracketsTime ||
			tournament.flags & TournamentFlags.BracketsCreated
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
		} catch (error) {
			this.sendError(
				step,
				tournament.logChannel,
				error,
				"Impossibile creare le brackets",
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
						`UPDATE Tournaments SET flags = flags | ?1 WHERE id = ?2`,
					).bind(TournamentFlags.BracketsCreated, this.tournamentId),
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

	private sendError = (
		step: WorkflowStep,
		channelId: string,
		error: unknown,
		message = "Si è verificato un errore",
	) => {
		const id = crypto.randomUUID();

		error = normalizeError(error);
		this.ctx.waitUntil(
			step.do<void>(`Report error ${id} in logs channel`, () =>
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
											content: `### ${message} (${id})\n\`\`\`\n${(error as Error).stack}\n\`\`\``,
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
}
