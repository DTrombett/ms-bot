import { Schema } from "mongoose";
import { createModel } from "./createModel";
import { number, string } from "./utilTypes";

export type MatchDaySchema = {
	_id: number;
	day: number;
	messageId?: string;
	finished: boolean;
	predictionsSent: boolean;
	matches: {
		date: number;
		teams: string;
	}[];
};

export const matchDaySchema = new Schema<MatchDaySchema>({
	_id: number,
	day: number,
	messageId: String,
	finished: { type: Boolean, default: false },
	predictionsSent: { type: Boolean, default: false },
	matches: {
		type: [{ date: number, teams: string }],
		required: true,
	},
});

export const MatchDay = createModel("MatchDay", matchDaySchema);
