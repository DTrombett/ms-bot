import { importVariable, writeVariable } from "./database";

/**
 * Set a timeout that will be restored after the bot restarts.
 * @param name - The file name with the callback to be called after the timeout
 * @param time - The time to wait before calling the callback
 * @param args - The arguments to pass to the callback
 */
export const setPermanentTimeout = async (
	name: string,
	time: number,
	...args: string[]
): Promise<NodeJS.Timeout> => {
	const timeouts = await importVariable("timeouts");
	const date = Date.now() + time;
	const timeout = setTimeout(async () => {
		await Promise.all([
			import(`./util/timeouts/${name}.js`).then(
				(module: { default: (...funcArgs: typeof args) => unknown }) =>
					module.default(...args)
			),
			importVariable("timeouts").then((newTimeouts) =>
				writeVariable(
					"timeouts",
					newTimeouts.filter((t) => t.date !== date)
				)
			),
		]);
	}, time).unref();

	await writeVariable("timeouts", [
		...timeouts,
		{
			date,
			name,
			args,
		},
	]);
	return timeout;
};
