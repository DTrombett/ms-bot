import { env, waitUntil } from "cloudflare:workers";
import { Routes, type RESTGetAPIUserResult } from "discord-api-types/v10";
import { Brawl, Clash } from "../../commands";
import {
	DiscordIdRegex,
	QueueMessageType,
	RegistrationMode,
	TournamentFlags,
} from "../Constants";
import { UserError } from "../UserError";
import { rest } from "../globals";
import { TimeUnit } from "../time";

export enum RegisterErrorType {
	InvalidId,
	UnknownTournament,
	WrongMode,
	AlreadyRegistered,
	Closed,
	MaxParticipants,
	NotOpenYet,
	TagRequired,
	AlreadyLinked,
}

export class RegisterError extends UserError {
	constructor(
		public type: RegisterErrorType,
		message: string,
		options?: ErrorOptions,
	) {
		super(message, options);
	}
}

export const register = async (
	tournamentId: number,
	{
		admin,
		defer,
		mode,
		name,
		simulate,
		tag,
		userId,
		addRoles = true,
	}: (
		| { admin: string; mode?: RegistrationMode }
		| { admin?: false; mode: RegistrationMode }
	) & {
		tag?: string;
		name?: string;
		userId: string;
		addRoles?: boolean;
		simulate?: boolean;
		defer?: () => void;
	},
) => {
	if (!DiscordIdRegex.test(userId))
		throw new RegisterError(
			RegisterErrorType.InvalidId,
			"L'id utente non è valido!",
		);
	tag &&= Brawl.normalizeTag(tag);
	if (Number.isNaN(tournamentId))
		throw new RegisterError(
			RegisterErrorType.UnknownTournament,
			"L'id torneo non è valido!",
		);
	const tournament = await env.DB.prepare(
		`
			SELECT t.flags, t.game, t.guildId, t.maxPlayers, t.name,
				t.participantCount, t.registrationMode, t.registrationRole,
				t.registrationStart, t.registrationEnd, p.tag,
				p.userId IS NOT NULL AS registered, p.name AS participantName,
				CASE WHEN sp.tag IS NOT NULL THEN json_group_array(json_object(
					'tag', sp.tag,
					'userId', sp.userId,
					'active', sp.active,
					'name', sp.name
				)) ELSE '[]' END savedPlayers
			FROM Tournaments t
			LEFT JOIN Participants p ON p.tournamentId = t.id AND p.userId = ?2
			LEFT JOIN SupercellPlayers sp ON
				sp.type = t.game AND (sp.userId = ?2 OR sp.tag = ?3)
			WHERE t.id = ?1 GROUP BY t.id
		`,
	)
		.bind(tournamentId, userId, tag || null)
		.first<
			Pick<
				Database.Tournament,
				| "flags"
				| "game"
				| "guildId"
				| "maxPlayers"
				| "name"
				| "participantCount"
				| "registrationMode"
				| "registrationRole"
				| "registrationStart"
				| "registrationEnd"
			> &
				PossiblyNull<
					Pick<Database.Participant, "tag"> & {
						participantName: Database.Participant["name"];
					}
				> & {
					registered: 0 | 1;
					savedPlayers:
						| string
						| Pick<
								Database.SupercellPlayer,
								"tag" | "userId" | "active" | "name"
						  >[];
				}
		>();
	const now = Date.now() / TimeUnit.Second;

	if (!tournament)
		throw new RegisterError(
			RegisterErrorType.UnknownTournament,
			"Torneo non trovato!",
		);
	tournament.savedPlayers = JSON.parse(tournament.savedPlayers as string) as [];
	const savedPlayer =
		tag ?
			tournament.savedPlayers.find((p) => p.tag === tag)
		:	(tournament.savedPlayers.find((p) => p.active) ??
			tournament.savedPlayers[0]);
	tag ??= savedPlayer?.tag;
	const tagRequired = (tournament.flags & TournamentFlags.TagRequired) != 0;
	if (tournament.registered)
		throw new RegisterError(
			RegisterErrorType.AlreadyRegistered,
			`Sei già iscritto a questo torneo come **${tournament.participantName}**${tournament.tag ? ` (${tournament.tag})` : ""}!`,
		);
	if (savedPlayer && savedPlayer.userId !== userId)
		throw new RegisterError(
			RegisterErrorType.AlreadyLinked,
			`Questo tag risulta già collegato a <@${savedPlayer.userId}>!`,
		);
	if (tagRequired && !tag)
		throw new RegisterError(
			RegisterErrorType.TagRequired,
			"È richiesto inserire un tag per iscriversi a questo torneo!",
		);
	if (typeof admin !== "string") {
		if ((tournament.registrationMode & mode!) === 0)
			throw new RegisterError(
				RegisterErrorType.WrongMode,
				`Questo torneo non accetta iscrizioni tramite ${RegistrationMode[mode!]}!`,
			);
		if (now > tournament.registrationEnd!)
			throw new RegisterError(
				RegisterErrorType.Closed,
				"Le iscrizioni sono chiuse!",
			);
		if (tournament.participantCount >= (tournament.maxPlayers ?? Infinity))
			throw new RegisterError(
				RegisterErrorType.MaxParticipants,
				"Questo torneo ha raggiunto il massimo numero di iscritti!",
			);
		if (!tournament.registrationStart || tournament.registrationStart > now)
			throw new RegisterError(
				RegisterErrorType.NotOpenYet,
				"Le iscrizioni ancora non aprono!",
			);
	}
	defer?.();
	const player =
		tagRequired ?
			await ([Brawl, Clash] as const)[tournament.game].getPlayer(tag!)
		:	null;
	const user =
		tagRequired ? null : (
			((await rest.get(Routes.user(userId))) as RESTGetAPIUserResult)
		);
	name ??= player?.name ?? user?.global_name ?? user!.username;
	if (!simulate) {
		const statements = [
			env.DB.prepare(
				`
					INSERT INTO Participants (tournamentId, userId, name, tag)
					VALUES (?1, ?2, ?3, ?4)
				`,
			).bind(tournamentId, userId, name, tag || null),
		];
		if (tag && (!savedPlayer || tagRequired))
			statements.unshift(
				env.DB.prepare(
					`
						INSERT INTO SupercellPlayers (tag, userId, type, name, active)
						VALUES (?1, ?2, ?3, ?4, NOT EXISTS (
							SELECT TRUE FROM SupercellPlayers
							WHERE userId = ?2 AND type = ?3 AND active = TRUE
						))
						ON CONFLICT(tag, type) DO UPDATE
						SET name = excluded.name
					`,
				)
					// SP name is not used much anyway and is discontinued in favor of Participants.name
					.bind(tag, userId, tournament.game, tagRequired ? name : ""),
			);
		tournament.participantCount++;
		waitUntil(
			env.QUEUE.send({
				t: QueueMessageType.TournamentMessageEdit,
				d: { id: tournamentId },
			} satisfies QueueMessage),
		);
		await Promise.all([
			tournament.registrationRole &&
				addRoles &&
				rest.put(
					Routes.guildMemberRole(
						tournament.guildId,
						userId,
						tournament.registrationRole,
					),
					{
						reason: `Iscrizione al torneo ${tournament.name}${tag ? ` come ${tag}` : ""}${admin ? ` da parte di ${admin}` : ""} (${tournament.participantCount} iscritti totali)`,
					},
				),
			env.DB.batch(statements),
		]);
	}
	return {
		tournament,
		user,
		player,
		name,
		tag,
		savedPlayers: tournament.savedPlayers,
		tournamentId,
		userId,
	};
};
