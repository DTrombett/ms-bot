import { Schema } from "mongoose";
import type * as actions from "../actions";
import { createModel } from "./createModel";
import { number, string } from "./utilTypes";

export type TimeoutSchema<
	K extends keyof typeof actions = keyof typeof actions,
> = {
	action: K;
	date: number;
	options: Parameters<(typeof actions)[K]> extends [any, ...infer O]
		? O
		: never;
};

export const timeoutSchema = new Schema<TimeoutSchema>({
	action: string,
	date: number,
	options: Array,
});

export const Timeout = createModel("Timeout", timeoutSchema);
