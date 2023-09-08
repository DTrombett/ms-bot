import { Schema } from "mongoose";
import { createModel } from "./createModel";
import { string } from "./utilTypes";

export type UserSchema = {
	_id: string;
	predictions?: {
		prediction: string;
		teams: readonly [string, string];
	}[];
};

export const userSchema = new Schema<UserSchema>({
	_id: string,
	predictions: [{ prediction: string, teams: { required: true, type: [string] } }],
});

export const User = createModel("User", userSchema);
