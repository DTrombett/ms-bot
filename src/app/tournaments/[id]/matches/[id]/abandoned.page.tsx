import { env } from "cloudflare:workers";
import { DBMatchStatus } from "../../../../../util/Constants";
import { runPatchRequest } from "../../../../../util/tournaments/patchMatch";

export const DELETE: PageHandler = async ({
	json,
	params: [id, matchId],
	authenticate,
	url,
}) => {
	const userId = url.searchParams.get("user");

	return runPatchRequest(
		Number(id),
		Number(matchId),
		env.DB.prepare(
			`
				UPDATE Matches
				SET ${
					userId ?
						`
					status = CASE
						WHEN (user1 = ?3 AND result2 IS NOT NULL) OR (user2 = ?3 AND result1 IS NOT NULL) THEN ?4
						ELSE status
					END,
					result1 = CASE
						WHEN user1 = ?3 THEN COALESCE(result1, 0)
						ELSE result1
					END,
					result2 = CASE
						WHEN user2 = ?3 THEN COALESCE(result2, 0)
						ELSE result2
					END`
					:	`
					status = ?4,
					result1 = COALESCE(result1, 0),
					result2 = COALESCE(result2, 0)`
				}
				WHERE tournamentId = ?1 AND id = ?2 ${userId ? "AND (?3 = user1 OR ?3 = user2)" : ""}
				RETURNING *
			`,
		).bind(Number(id), Number(matchId), userId, DBMatchStatus.Playing),
		authenticate,
		json,
	);
};

export const POST: PageHandler = async ({
	json,
	params: [id, matchId],
	authenticate,
	url,
}) => {
	const userId = url.searchParams.get("user");

	return runPatchRequest(
		Number(id),
		Number(matchId),
		env.DB.prepare(
			`
				UPDATE Matches
				SET ${
					userId ?
						`
					result1 = CASE
						WHEN user1 = ?3 THEN NULL
						WHEN user2 = ?3 AND status != ?4 THEN COALESCE(result1, 0)
						ELSE result1
					END,
					result2 = CASE
						WHEN user2 = ?3 THEN NULL
						WHEN user1 = ?3 AND status != ?4 THEN COALESCE(result2, 0)
						ELSE result2
					END,
					status = ?4`
					:	`
					result1 = NULL,
					result2 = NULL,
					status = ?4`
				}
				WHERE tournamentId = ?1 AND id = ?2 ${userId ? "AND (?3 = user1 OR ?3 = user2)" : ""}
				RETURNING *
			`,
		).bind(Number(id), Number(matchId), userId, DBMatchStatus.Abandoned),
		authenticate,
		json,
	);
};
