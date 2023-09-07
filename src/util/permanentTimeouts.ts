import { Snowflake } from "discord.js";
import { setTimeout } from "node:timers/promises";
import * as actions from "../actions";
import { Document, Timeout, TimeoutSchema } from "../models";
import CustomClient from "./CustomClient";

export const timeoutCache: Record<string, Document<typeof Timeout> | undefined> = {};

export const setActionTimeout = async (client: CustomClient, timeout: Document<typeof Timeout>) => {
	const delay = timeout.date - Date.now();

	if (delay < 2147483648)
		try {
			await setTimeout(delay, undefined, { ref: false });
			if (!timeoutCache[timeout.id as string]) return;
			delete timeoutCache[timeout.id as string];
			Promise.all([
				actions[timeout.action](client, ...(timeout.options as [Snowflake, string])),
				timeout.deleteOne(),
			]).catch(CustomClient.printToStderr);
		} catch (err) {}
};

export const loadTimeouts = async (client: CustomClient) => {
	for (const timeout of await Timeout.find({})) {
		timeoutCache[timeout.id as string] = timeout;
		setActionTimeout(client, timeout).catch(() => {});
	}
};

export const setPermanentTimeout = async <T extends keyof typeof actions>(
	client: CustomClient,
	timeout: TimeoutSchema<T>,
) => {
	const doc = new Timeout(timeout);

	timeoutCache[doc.id as string] = doc;
	if (doc.date < Date.now()) await doc.save();
	setActionTimeout(client, doc).catch(() => {});
	return doc;
};
