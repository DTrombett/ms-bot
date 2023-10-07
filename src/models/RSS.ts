import { Schema } from "mongoose";
import { createModel } from "./createModel";
import { number, string } from "./utilTypes";

export type RSSSchema = {
	channel: string;
	guild: string;
	link: string;
	lastUpdate: number;
};

export const rssSchema = new Schema<RSSSchema>({
	channel: string,
	guild: string,
	link: string,
	lastUpdate: number,
});

export const RSS = createModel("RSS", rssSchema);
