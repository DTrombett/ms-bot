import { env, waitUntil } from "cloudflare:workers";
import { Routes, type RESTGetAPIUserResult } from "discord-api-types/v10";
import { Brawl, Clash } from "../../commands";
import {
	RegistrationMode,
	TournamentFlags,
	type SupercellPlayerType,
} from "../Constants";
import { UserError } from "../UserError";
import { rest } from "../globals";
import { TimeUnit } from "../time";
import { editMessage } from "./editMessage";

export enum RegisterErrorType {
	UnknownTournament,
	WrongMode,
	AlreadyRegistered,
	Closed,
	MaxParticipants,
	NotOpenYet,
	TagRequired,
	AlreadyLinked,
}

const resolveName = async (
	tagRequired: boolean,
	game: SupercellPlayerType,
	userId: string,
	tag: string | undefined,
): Promise<string> => {
	if (tagRequired)
		return (await ([Brawl, Clash] as const)[game].getPlayer(tag!)).name;
	const user = (await rest.get(Routes.user(userId))) as RESTGetAPIUserResult;

	return user.global_name ?? user.username;
};
export const register = async (
	tournamentId: number,
	userId: string,
	mode: RegistrationMode,
	{ tag, name }: { tag?: string; name?: string },
) => {
	const tournament = await env.DB.prepare(
		`
			SELECT t.flags, t.game, t.id, t.maxPlayers, t.minPlayers,
				t.name, t.participantCount, t.registrationChannel,
				t.registrationMessage, t.registrationMode, t.registrationRole,
				t.registrationStart, t.registrationEnd, t.registrationTemplateLink,
				p.tag, p.userId, p.name AS participantName
			FROM Tournaments t
			LEFT JOIN Participants p ON p.tournamentId = t.id AND p.userId = ?2
			WHERE t.id = ?1
		`,
	)
		.bind(tournamentId, userId)
		.first<
			Pick<
				Database.Tournament,
				| "flags"
				| "game"
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
			> &
				PossiblyNull<
					Pick<Database.Participant, "tag" | "userId"> & {
						participantName: Database.Participant["name"];
					}
				>
		>();
	const now = Date.now() / TimeUnit.Second + 1;

	if (!tournament)
		throw new UserError("Torneo non trovato!", {
			cause: { type: RegisterErrorType.UnknownTournament },
		});
	if ((tournament.registrationMode & mode) === 0)
		throw new UserError(
			`Questo torneo non accetta iscrizioni tramite ${RegistrationMode[mode]}!`,
			{ cause: { type: RegisterErrorType.WrongMode } },
		);
	if (tournament.userId)
		throw new UserError(
			`Sei già iscritto a questo torneo come **${tournament.participantName}**${tournament.tag ? ` (${tournament.tag})` : ""}!`,
			{ cause: { type: RegisterErrorType.AlreadyRegistered } },
		);
	if (now > tournament.registrationEnd!)
		throw new UserError("Le iscrizioni sono chiuse!", {
			cause: { type: RegisterErrorType.Closed },
		});
	if (tournament.participantCount >= (tournament.maxPlayers ?? -1))
		throw new UserError(
			"Questo torneo ha raggiunto il massimo numero di iscritti!",
			{ cause: { type: RegisterErrorType.MaxParticipants } },
		);
	if (!tournament.registrationStart || tournament.registrationStart > now)
		throw new UserError("Le iscrizioni ancora non aprono!", {
			cause: { type: RegisterErrorType.NotOpenYet },
		});
	const tagRequired = (tournament.flags & TournamentFlags.TagRequired) != 0;
	if (tagRequired && !tag)
		throw new UserError(
			"È richiesto inserire un tag per iscriversi a questo torneo!",
			{ cause: { type: RegisterErrorType.UnknownTournament } },
		);
	name ??= await resolveName(tagRequired, tournament.game, userId, tag);
	if (tag) {
		const existing = await env.DB.prepare(
			`
				INSERT INTO SupercellPlayers (tag, userId, type, name, active)
				VALUES (?1, ?2, ?3, ?4, NOT EXISTS (
					SELECT TRUE
					FROM SupercellPlayers
					WHERE userId = ?2 AND type = ?3 AND active = TRUE
				))
				ON CONFLICT(tag, type) DO UPDATE
				SET name = excluded.name RETURNING userId
			`,
		)
			.bind(tag, userId, tournament.game, name)
			.first<Database.SupercellPlayer["userId"]>("userId");

		if (existing && existing !== userId)
			throw new UserError(
				`Questo tag risulta già collegato a <@${existing}>!`,
				{ cause: { type: RegisterErrorType.UnknownTournament } },
			);
	}
	tournament.participantCount++;
	waitUntil(editMessage(tournament));
	await Promise.all([
		tournament.registrationRole &&
			rest.put(
				Routes.guildMemberRole(
					env.MAIN_GUILD,
					userId,
					tournament.registrationRole,
				),
				{
					reason: `Iscrizione al torneo ${tournament.name}${tag ? ` come ${tag}` : ""} (${tournament.participantCount} iscritti totali)`,
				},
			),
		env.DB.prepare(
			`
				INSERT INTO Participants (tournamentId, userId, name, tag)
				VALUES (?1, ?2, ?3, ?4)
			`,
		)
			.bind(tournamentId, userId, name, tag || null)
			.run(),
	]);
	return tournament;
};
