import { env, waitUntil } from "cloudflare:workers";
import { Routes } from "discord-api-types/v10";
import { RegistrationMode, TournamentStatusFlags } from "../Constants";
import { UserError } from "../UserError";
import { rest } from "../globals";
import { editMessage } from "./editMessage";

export enum UnregisterErrorType {
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
	}:
		| ({ admin: true; mode?: RegistrationMode } & (
				| { userId: string; userIds?: never }
				| { userId?: never; userIds: string[] }
		  ))
		| {
				admin?: false;
				mode: RegistrationMode;
				userId: string;
				userIds?: never;
		  },
) => {
	if (userIds.length === 0) return;
	const tournament = await env.DB.prepare(
		`
			SELECT t.id, t.maxPlayers, t.minPlayers, t.name,
				t.participantCount, t.registrationChannel, t.registrationMessage,
				t.registrationMode, t.registrationRole, t.registrationStart,
				t.registrationEnd, t.registrationTemplateLink, t.statusFlags, p.userId
			FROM Tournaments t
			LEFT JOIN Participants p ON p.tournamentId = t.id AND p.userId = ?2
			WHERE t.id = ?1
		`,
	)
		.bind(tournamentId, userIds[0])
		.first<
			Pick<
				Database.Tournament,
				| "id"
				| "maxPlayers"
				| "minPlayers"
				| "name"
				| "participantCount"
				| "registrationChannel"
				| "registrationMessage"
				| "registrationMode"
				| "registrationRole"
				| "registrationStart"
				| "registrationEnd"
				| "registrationTemplateLink"
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
	if (!admin) {
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
	tournament.participantCount -= Math.floor(changes / 2);
	if (tournament.registrationRole)
		waitUntil(
			Promise.all(
				userIds.map((memberId) =>
					rest.delete(
						Routes.guildMemberRole(
							env.MAIN_GUILD,
							memberId,
							tournament.registrationRole!,
						),
						{
							reason: `Rimozione iscrizione al torneo ${tournament.name} (${tournament.participantCount} iscritti totali)`,
						},
					),
				),
			),
		);
	waitUntil(editMessage(tournament));
};
