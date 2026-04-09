import { DBMatchStatus } from "../Constants";

export const resolveWinner = <
	T extends Pick<
		Database.Match,
		"result1" | "result2" | "user1" | "user2" | "status"
	>,
>(
	match: T | undefined,
): undefined | null | T["user1"] | T["user2"] => {
	if (
		!match ||
		(match.status === DBMatchStatus.Abandoned &&
			match.result1 == null &&
			match.result2 == null)
	)
		return null;
	if (
		match.status === DBMatchStatus.Postponed ||
		match.status === DBMatchStatus.Playing ||
		match.status === DBMatchStatus.ToBePlayed ||
		match.result1 == match.result2
	)
		return undefined;
	return match[
		`user${(+((match.result2 ?? -1) > (match.result1 ?? -1)) + 1) as 1 | 2}`
	];
};
