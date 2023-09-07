import { Schema } from "mongoose";
import { createModel } from "./createModel";
import { number, string } from "./utilTypes";

export type MatchDaySchema = {
	day: number;
	matches: {
		date: number;
		teams: readonly [string, string];
	}[];
};

export const matchDaySchema = new Schema<MatchDaySchema>({
	day: number,
	matches: { type: [{ date: number, teams: { required: true, type: [string] } }], required: true },
});

export const MatchDay = createModel("MatchDay", matchDaySchema);
