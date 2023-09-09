import { Schema } from "mongoose";
import { createModel } from "./createModel";
import { number, string } from "./utilTypes";

export type MatchDaySchema = {
	day: number;
	matches: {
		date: number;
		teams: string;
	}[];
};

export const matchDaySchema = new Schema<MatchDaySchema>({
	day: number,
	matches: {
		type: [{ date: number, teams: string }],
		required: true,
	},
});

export const MatchDay = createModel("MatchDay", matchDaySchema);
