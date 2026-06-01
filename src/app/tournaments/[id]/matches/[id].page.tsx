import { env } from "cloudflare:workers";
import { runPatchRequest } from "../../../../util/tournaments/patchMatch";

export const PATCH: PageHandler = async ({
	params: [id, matchId],
	url,
	authenticate,
	json,
}) => {
	const result1 = url.searchParams.get("result1"),
		result2 = url.searchParams.get("result2"),
		status = url.searchParams.get("status");

	return runPatchRequest(
		Number(id),
		Number(matchId),
		env.DB.prepare(
			`
				UPDATE Matches
				SET result1 = COALESCE(?3, result1),
					result2 = COALESCE(?4, result2),
					status	= COALESCE(?5, status)
				WHERE tournamentId = ?1 AND id = ?2
				RETURNING *
			`,
		).bind(
			Number(id),
			Number(matchId),
			result1 ? +result1 : null,
			result2 ? +result2 : null,
			status ? +status : null,
		),
		authenticate,
		json,
	);
};
