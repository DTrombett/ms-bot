import { env } from "cloudflare:workers";
import {
	ButtonStyle,
	ComponentType,
	OverwriteType,
	PermissionFlagsBits,
	Routes,
	type RESTPatchAPIChannelJSONBody,
	type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { DBMatchStatus, TournamentRoundMode } from "../Constants";
import { rest } from "../globals";
import normalizeError from "../normalizeError";
import { placeholder } from "../strings";
import { createSetCookie, isAdmin } from "../token";
import { finishRound } from "./finishRound";
import { resolveWinner } from "./resolveWinner";

const editChannel = async (
	match: Database.Match,
	tournament: Pick<Database.Tournament, "endedChannelName">,
	tournamentId: number,
) => {
	if (
		(match.status !== DBMatchStatus.Abandoned &&
			match.status !== DBMatchStatus.Finished) ||
		!match.channelId ||
		!tournament.endedChannelName
	)
		return;
	let { results } = await env.DB.prepare(
		`
			SELECT userId, tag, team, name
			FROM Participants WHERE tournamentId = ?1 AND userId IN (?2, ?3)
		`,
	)
		.bind(tournamentId, match.user1, match.user2)
		.run<Pick<Database.Participant, "tag" | "userId" | "team" | "name">>();

	if (results[1]?.userId === match.user1) results = [results[1], results[0]!];
	return rest.patch(Routes.channel(match.channelId), {
		body: {
			name:
				tournament.endedChannelName ?
					placeholder(tournament.endedChannelName, {
						matchId: match.id.toString(),
						tournamentId: tournamentId.toString(),
						id1: match.user1,
						id2: match.user2!,
						tag1: results[0]?.tag?.slice(1) ?? "",
						tag2: results[1]?.tag?.slice(1) ?? "",
						player1: results[0]?.name ?? "",
						player2: results[1]?.name ?? "",
					}).slice(0, 100)
				:	undefined,
			position: 49 + 2 ** (Math.floor(Math.log2(match.id + 1)) + 1),
		} satisfies RESTPatchAPIChannelJSONBody,
	});
};
export const displayMatchScore = (
	match: Pick<
		Database.Match,
		"status" | "result1" | "result2" | "user1" | "user2"
	>,
) =>
	`<@${match.user1}> VS ${match.user2 ? `<@${match.user2}>` : "N/A"}: ${
		match.status === DBMatchStatus.Abandoned && match.result1 == null ?
			"A"
		:	String(match.result1 ?? 0)
	} - ${
		match.user2 ?
			match.status === DBMatchStatus.Abandoned && match.result2 == null ?
				"A"
			:	String(match.result2 ?? 0)
		:	"N"
	}`;
export const runPatchRequest = async (
	request: Request,
	tournamentId: number,
	matchId: number,
	statement: D1PreparedStatement,
) => {
	const { setCookie, token } = await createSetCookie(request);
	if (!token)
		return Response.json(
			{ message: "Effettua nuovamente il login" },
			{
				status: 401,
				headers: { "accept-ch": "Sec-CH-UA-Mobile", "set-cookie": setCookie },
			},
		);
	const admin = await isAdmin(token);

	if (!admin)
		return Response.json(
			{ message: "Solo gli amministratori possono effettuare questa azione" },
			{
				status: 403,
				headers: { "accept-ch": "Sec-CH-UA-Mobile", "set-cookie": setCookie },
			},
		);
	try {
		const match = await patchMatch(tournamentId, matchId, statement, token.i);

		if (!match)
			return Response.json(
				{ message: "Scontro non trovato" },
				{
					status: 404,
					headers: { "accept-ch": "Sec-CH-UA-Mobile", "set-cookie": setCookie },
				},
			);
		return Response.json(match, {
			status: 200,
			headers: { "accept-ch": "Sec-CH-UA-Mobile", "set-cookie": setCookie },
		});
	} catch (err) {
		return Response.json(
			{ message: normalizeError(err).message },
			{
				status: 500,
				headers: { "accept-ch": "Sec-CH-UA-Mobile", "set-cookie": setCookie },
			},
		);
	}
};

export const patchMatch = async (
	tournamentId: number,
	matchId: number,
	statement: D1PreparedStatement,
	userId: string,
) => {
	const parent = Math.floor((matchId - 1) / 2);
	const [
		{
			meta: { changed_db },
			results: [match],
		},
		{
			results: [sibling],
		},
		{
			results: [tournament],
		},
	] = (await env.DB.batch([
		statement,
		env.DB.prepare(
			`
				SELECT status, result1, result2, user1, user2
				FROM Matches
				WHERE tournamentId = ?1 AND id = ?2
			`,
		).bind(tournamentId, matchId + (matchId % 2 || -1)),
		env.DB.prepare(
			`
				SELECT t.logChannel, t.currentRound, t.roundType, t.workflowId, t.endedChannelName, m.channelId, m.user1, m.user2,
				(
					SELECT COUNT(*)
					FROM Matches m2
					WHERE m2.tournamentId = t.id
					  AND (m2.status = ?3 OR m2.status = ?4)
					  AND m2.id BETWEEN
						  ((1 << t.currentRound) - 1)
						  AND
						  ((1 << (t.currentRound + 1)) - 2)
				) AS pendingMatches
				FROM Tournaments t
				LEFT JOIN Matches m ON m.tournamentId = t.id AND m.id = ?2
				WHERE t.id = ?1
			`,
		).bind(
			tournamentId,
			parent,
			DBMatchStatus.Playing,
			DBMatchStatus.ToBePlayed,
		),
	])) as [
		D1Result<Database.Match>,
		D1Result<
			Pick<Database.Match, "status" | "result1" | "result2" | "user1" | "user2">
		>,
		D1Result<
			Pick<
				Database.Tournament,
				| "logChannel"
				| "currentRound"
				| "roundType"
				| "workflowId"
				| "endedChannelName"
			> &
				Partial<Pick<Database.Match, "channelId" | "user1" | "user2">> & {
					pendingMatches: number;
				}
		>,
	];

	if (!match || !tournament) return null;
	if (changed_db) {
		let [a, b] = [resolveWinner(match), resolveWinner(sibling)];
		if (!a && b) [a, b] = [b, a];
		const changes =
			tournament.user1 != null &&
			(tournament.user1 !== a || tournament.user2 !== b);

		await Promise.all([
			rest.post(Routes.channelMessages(tournament.logChannel), {
				body: {
					content: `Scontro aggiornato!\n## ${displayMatchScore(match)}\n-# <@${userId}> ha aggiornato lo scontro ${matchId}\n${
						changes ?
							`## Lo scontro ${parent} (<@${tournament.user1}> VS ${
								tournament.user2 ? `<@${tournament.user2}>` : "N/A"
							}) è stato invalidato ${
								!a || b === undefined ?
									""
								:	`ed è ora <@${a}> VS ${b ? `<@${b}>` : "N/A"}`
							}`
						:	""
					}\n${tournament.currentRound == null ? "" : `-# Ci sono ${tournament.pendingMatches.toLocaleString()} partite da concludere nel round attuale`}`,
					components:
						(
							!tournament.pendingMatches &&
							(tournament.currentRound === Math.floor(Math.log2(matchId + 1)) ||
								tournament.currentRound ===
									Math.floor(Math.log2(parent + 1))) &&
							tournament.roundType === TournamentRoundMode.Manual
						) ?
							[
								{
									type: ComponentType.ActionRow,
									components: [
										{
											type: ComponentType.Button,
											custom_id: `tournament-ava-${tournamentId}-${tournament.currentRound}`,
											style: ButtonStyle.Success,
											emoji: { name: "⏭️" },
											label: "Termina round",
										},
									],
								},
							]
						:	[],
					allowed_mentions: { parse: [] },
				} satisfies RESTPostAPIChannelMessageJSONBody,
			}),
			changes &&
				(!a || b === undefined ?
					env.DB.prepare(
						`
							DELETE FROM Matches
							WHERE tournamentId = ?1 AND id = ?2
						`,
					).bind(tournamentId, parent)
				:	env.DB.prepare(
						`
							UPDATE Matches SET
								user1 = ?3,
								user2 = ?4,
								status = ?5,
								result1 = ?6,
								result2 = NULL
							WHERE tournamentId = ?1 AND id = ?2
						`,
					).bind(
						tournamentId,
						parent,
						a,
						b,
						b === null ? DBMatchStatus.Default : DBMatchStatus.Playing,
						b && 0,
					)
				).run(),
			changes &&
				tournament.channelId &&
				(b ?
					rest.patch(Routes.channel(tournament.channelId), {
						body: {
							permission_overwrites: [
								{
									id: env.MAIN_GUILD,
									type: OverwriteType.Role,
									deny: String(PermissionFlagsBits.ViewChannel),
								},
								{
									id: a!,
									type: OverwriteType.Member,
									allow: String(PermissionFlagsBits.ViewChannel),
								},
								{
									id: b,
									type: OverwriteType.Member,
									allow: String(PermissionFlagsBits.ViewChannel),
								},
								{
									// TODO: Add this as option to tournament
									id: "1484914959673463004",
									type: OverwriteType.Role,
									allow: String(PermissionFlagsBits.ViewChannel),
								},
								...env.ALLOWED_ROLES.split(",").map((id) => ({
									id,
									type: OverwriteType.Role,
									allow: String(
										PermissionFlagsBits.ViewChannel |
											PermissionFlagsBits.ManageChannels,
									),
								})),
							],
						} satisfies RESTPatchAPIChannelJSONBody,
					})
				:	rest.delete(Routes.channel(tournament.channelId))),
			editChannel(match, tournament, tournamentId),
			tournament.roundType === TournamentRoundMode.Once &&
				tournament.workflowId &&
				!tournament.pendingMatches &&
				(tournament.currentRound === Math.floor(Math.log2(matchId + 1)) ||
					tournament.currentRound === Math.floor(Math.log2(parent + 1))) &&
				finishRound(tournament.workflowId, tournament.currentRound),
		]);
	}
	return match;
};
