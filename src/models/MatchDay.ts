import { Schema } from "mongoose";
import { createModel } from "./createModel";
import { number, string } from "./utilTypes";

export type MatchDaySchema = {
	_id: number;
	day: number;
	messageId?: string;
	finished?: boolean;
	matches: {
		date: number;
		teams: string;
	}[];
};

export const matchDaySchema = new Schema<MatchDaySchema>({
	_id: number,
	day: number,
	messageId: String,
	finished: Boolean,
	matches: {
		type: [{ date: number, teams: string }],
		required: true,
	},
});

export const MatchDay = createModel("MatchDay", matchDaySchema);
