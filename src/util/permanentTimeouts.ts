import { setTimeout } from "node:timers/promises";
import * as actions from "../actions";
import { Document, Timeout, TimeoutSchema } from "../models";
import CustomClient from "./CustomClient";
import { printToStderr } from "./logger";

export const timeoutCache: Record<
	string,
	Document<typeof Timeout> | undefined
> = {};
const controllers: Record<string, (() => void) | undefined> = {};

const setActionTimeout = async (
	client: CustomClient,
	timeout: Document<typeof Timeout>,
) => {
	const delay = timeout.date - Date.now();

	if (delay < 2_147_483_648)
		try {
			const abortController = new AbortController();

			controllers[timeout.id as string] =
				abortController.abort.bind(abortController);
			await setTimeout(delay, undefined, {
				ref: false,
				signal: abortController.signal,
			});
			if (!timeoutCache[timeout.id as string]) return;
			delete timeoutCache[timeout.id as string];
			Promise.all([
				(
					actions as Record<
						string,
						((client: CustomClient, ...args: any[]) => any) | undefined
					>
				)[timeout.action]?.(client, ...timeout.options),
				timeout.deleteOne(),
			]).catch(printToStderr);
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
	if (doc.date > Date.now()) await doc.save();
	setActionTimeout(client, doc)
		.catch(() => {})
		.catch(() => {});
	return doc;
};

export const removePermanentTimeout = async (id: string) => {
	controllers[id]?.();
	await timeoutCache[id]?.deleteOne();
	delete timeoutCache[id];
};
