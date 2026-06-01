import { env } from "cloudflare:workers";
import { Routes } from "discord-api-types/v10";
import { Brawl, Clash } from "../../../commands";
import { SupercellPlayerType } from "../../../util/Constants";
import { rest } from "../../../util/globals";
import { JsonStreamResponse } from "../../../util/responses";

export const GET: PageHandler = async ({ params: [id], response, url }) => {
	try {
		const users = url.searchParams.getAll("user"),
			matchId = Number(url.searchParams.get("id"));
		const tournamentId = Number(id);
		if (Number.isNaN(tournamentId))
			return JsonStreamResponse.error("Torneo non trovato", {
				...response,
				status: 404,
			});
		if (Number.isNaN(matchId))
			return JsonStreamResponse.error("ID scontro non valido", {
				...response,
				status: 404,
			});
		const statements: D1PreparedStatement[] = [
			env.DB.prepare(`SELECT game, guildId FROM Tournaments WHERE id = ?`).bind(
				tournamentId,
			),
			env.DB.prepare(
				`SELECT * FROM Matches WHERE tournamentId = ?1 AND id = ?2`,
			).bind(tournamentId, matchId),
		];

		if (users.length)
			statements.push(
				env.DB.prepare(
					`
						SELECT tag, userId, name FROM Participants
						WHERE tournamentId = ? AND userId IN (${new Array(users.length)
							.fill("?")
							.join(",")})
					`,
				).bind(tournamentId, ...users),
			);
		const [
			{
				results: [tournament],
			},
			{
				results: [match],
			},
			{ results: participants } = { results: [] },
		] = (await env.DB.batch(statements)) as [
			D1Result<Pick<Database.Tournament, "game" | "guildId">>,
			D1Result<Database.Match>,
			(
				| D1Result<Pick<Database.Participant, "tag" | "userId" | "name">>
				| undefined
			),
		];
		if (!tournament)
			return JsonStreamResponse.error("Torneo non trovato", {
				...response,
				status: 404,
			});
		const res = new JsonStreamResponse(response).sendAll(
			{ event: "match", data: match },
			...participants.map((data) => ({ event: "participant", data })),
		);
		for (const participant of participants) {
			res.send(
				"member",
				rest.get(Routes.guildMember(tournament.guildId, participant.userId)),
			);
			if (participant.tag)
				res.send(
					"player",
					(tournament.game === SupercellPlayerType.BrawlStars ?
						Brawl
					:	Clash
					).getPlayer(participant.tag),
				);
		}
		return res.end();
	} catch (err) {
		console.error(err);
		response.status = 500;
		return;
	}
};
