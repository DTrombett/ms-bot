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
		const { registrationStart, logChannel } = await step.do(
			"Get registration start time",
			async () => {
				const result = await this.env.DB.prepare(
					`SELECT registrationStart, registrationMode, registrationTemplateLink, registrationChannel, logChannel
					FROM Tournaments WHERE id = ?`,
				)
					.bind(this.tournamentId)
					.first<
						Pick<
							Database.Tournament,
							| "logChannel"
							| "registrationStart"
							| "registrationMode"
							| "registrationTemplateLink"
							| "registrationChannel"
						>
					>();

				return (
						result?.registrationStart &&
							result.registrationChannel &&
							result.registrationTemplateLink &&
							result.registrationMode & RegistrationMode.Discord
					) ?
						{
							registrationStart: result.registrationStart,
							logChannel: result.logChannel,
						}
					:	{};
			},
		);
		let bracketsTime: number | null | undefined;

		ok(logChannel, "Tournament not found");
		if (registrationStart)
			bracketsTime = await this.sendRegistrationMessage(
				registrationStart,
				step,
			);
		bracketsTime ??= await step.do("Get brackets time", async () => {
			const result = await this.env.DB.prepare(
				`SELECT bracketsTime, flags FROM Tournaments WHERE id = ?`,
			)
				.bind(this.tournamentId)
				.first<Pick<Database.Tournament, "bracketsTime" | "flags">>();

			return (result?.flags ?? 0) & TournamentFlags.BracketsCreated ?
					null
				:	result?.bracketsTime;
		});
		if (bracketsTime) await this.createBrackets(bracketsTime, step, logChannel);
	}

	private async sendRegistrationMessage(
		registrationStart: number,
		step: WorkflowStep,
	) {
		if (registrationStart * TimeUnit.Second > Date.now() + TimeUnit.Second)
			await step.sleepUntil(
				"Wait for registration start",
				new Date(registrationStart * TimeUnit.Second),
			);
		const registration = await step.do(
			"Get registration data",
			this.getRegistrationData,
		);

		if (registration.logChannel)
			try {
				const id = await step.do<string>(
					"Send registration message",
					async () =>
						rest[registration.message ? "patch" : "post"](
							registration.message ?
								Routes.channelMessage(
									registration.channel,
									registration.message,
								)
							:	Routes.channelMessages(registration.channel),
							{
								body: await createRegistrationMessage(
									this.tournamentId,
									registration.template,
									registration.count,
									registration.name,
									registration.minPlayers,
								),
							},
						).then(
							(m) =>
								(
									m as
										| RESTPostAPIChannelMessageResult
										// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
										| RESTPatchAPIChannelMessageResult
								).id,
						),
				);

				if (!registration.message)
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
					registration.logChannel,
					error,
					"Impossibile inviare il messaggio di iscrizione nel canale specificato",
				);
			}
		return registration.bracketsTime ?? 0;
	}

	private getRegistrationData = async () => {
		const result = await this.env.DB.prepare(
			`
				SELECT name, flags, minPlayers, registrationMode, registrationChannel, registrationTemplateLink, logChannel, registrationMessage, bracketsTime,
					(
						SELECT COUNT(*)
						FROM Participants
						WHERE tournamentId = Tournaments.id
					) AS participantCount
				FROM Tournaments WHERE id = ?
			`,
		)
			.bind(this.tournamentId)
			.first<
				Pick<
					Database.Tournament,
					| "bracketsTime"
					| "flags"
					| "logChannel"
					| "minPlayers"
					| "name"
					| "registrationChannel"
					| "registrationMessage"
					| "registrationMode"
					| "registrationTemplateLink"
				> & { participantCount: number }
			>();
		const bracketsTime =
			(result?.flags ?? 0) & TournamentFlags.BracketsCreated ?
				null
			:	result?.bracketsTime;

		return (
				result?.registrationChannel &&
					result?.registrationTemplateLink &&
					result.registrationMode & RegistrationMode.Discord
			) ?
				{
					logChannel: result.logChannel,
					channel: result.registrationChannel,
					template: result.registrationTemplateLink,
					count: result.participantCount,
					name: result.name,
					minPlayers: result.minPlayers,
					message: result.registrationMessage,
					bracketsTime,
				}
			:	{ bracketsTime };
	};

	private async createBrackets(
		bracketsTime: number,
		step: WorkflowStep,
		logChannel: string,
	) {
		if (bracketsTime * TimeUnit.Second > Date.now() + TimeUnit.Second)
			await step.sleepUntil(
				"Wait for brackets time",
				new Date(bracketsTime * TimeUnit.Second),
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
			this.sendError(step, logChannel, error, "Impossibile creare le brackets");
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
