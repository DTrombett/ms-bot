import { env, waitUntil } from "cloudflare:workers";
import { Routes } from "discord-api-types/v10";
import {
	DiscordIdRegex,
	QueueMessageType,
	RegistrationMode,
	TournamentStatusFlags,
} from "../Constants";
import { UserError } from "../UserError";
import { rest } from "../globals";

export enum UnregisterErrorType {
	InvalidId,
	UnknownTournament,
	WrongMode,
	NotRegistered,
	Closed,
}

export const unregister = async (
	tournamentId: number,
	{
		admin,
		mode,
		userId,
		userIds = [userId!],
		removeRoles = true,
	}: (
		| ({ admin: string; mode?: RegistrationMode } & (
				| { userId: string; userIds?: never }
				| { userId?: never; userIds: string[] }
		  ))
		| { admin?: false; mode: RegistrationMode; userId: string; userIds?: never }
	) & { removeRoles?: boolean },
) => {
	if (userId && !DiscordIdRegex.test(userId))
		throw new UserError("L'id utente non è valido!", {
			cause: { type: UnregisterErrorType.InvalidId },
		});
	if (Number.isNaN(tournamentId))
		throw new UserError("L'id torneo non è valido!", {
			cause: { type: UnregisterErrorType.UnknownTournament },
		});
	if (userIds.length === 0) return;
	const tournament = await env.DB.prepare(
		`
			SELECT t.guildId, t.name, t.participantCount, t.registrationMode,
				t.registrationRole, t.statusFlags, p.userId
			FROM Tournaments t
			LEFT JOIN Participants p ON p.tournamentId = t.id AND p.userId = ?2
			WHERE t.id = ?1
		`,
	)
		.bind(tournamentId, userIds[0])
		.first<
			Pick<
				Database.Tournament,
				| "guildId"
				| "name"
				| "participantCount"
				| "registrationMode"
				| "registrationRole"
				| "statusFlags"
			> &
				PossiblyNull<Pick<Database.Participant, "userId">>
		>();

	if (!tournament)
		throw new UserError("Torneo non trovato!", {
			cause: { type: UnregisterErrorType.UnknownTournament },
		});
	if (tournament.statusFlags & TournamentStatusFlags.BracketsCreated)
		throw new UserError("Le iscrizioni sono chiuse!", {
			cause: { type: UnregisterErrorType.Closed },
		});
	if (typeof admin !== "string") {
		if ((tournament.registrationMode & mode) === 0)
			throw new UserError(
				`Questo torneo non accetta iscrizioni tramite ${RegistrationMode[mode]}!`,
				{ cause: { type: UnregisterErrorType.WrongMode } },
			);
		if (!tournament.userId)
			throw new UserError("Non risulti iscritto a questo torneo!", {
				cause: { type: UnregisterErrorType.NotRegistered },
			});
	}
	const {
		meta: { changes },
	} = await env.DB.prepare(
		`DELETE FROM Participants WHERE tournamentId = ? AND userId IN (${new Array(
			userIds.length,
		)
			.fill("?")
			.join(",")})`,
	)
		.bind(tournamentId, ...userIds)
		.run();
	// Every deletion causes a modification of Tournament
	tournament.participantCount -= Math.floor(changes / 2);
	if (tournament.registrationRole && removeRoles)
		waitUntil(
			Promise.all(
				userIds.map((memberId) =>
					rest.delete(
						Routes.guildMemberRole(
							tournament.guildId,
							memberId,
							tournament.registrationRole!,
						),
						{
							reason: `Rimozione iscrizione al torneo ${tournament.name}${admin ? ` da parte di ${admin}` : ""} (${tournament.participantCount} iscritti totali)`,
						},
					),
				),
			),
		);
	waitUntil(
		env.QUEUE.send({
			t: QueueMessageType.TournamentMessageEdit,
			d: { id: tournamentId },
		} satisfies QueueMessage),
	);
};
