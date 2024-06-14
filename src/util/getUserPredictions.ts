import type { Env, Prediction, User } from "./types";

export const getUserPredictions = (
	env: Env,
	matches: { id: string }[],
	id?: string,
) =>
	env.DB.prepare(
		`SELECT Predictions.matchId,
									Predictions.prediction,
									Users.team
								FROM Predictions
									JOIN Users ON Predictions.userId = Users.id
								WHERE Users.id = ?
									AND Predictions.matchId IN (${Array(matches.length).fill("?").join(", ")})`,
	)
		.bind(id, ...matches.map((m) => m.id))
		.all<Pick<Prediction, "matchId" | "prediction"> & Pick<User, "team">>();
