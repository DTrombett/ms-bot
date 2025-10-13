import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { mock, suite, test } from "node:test";
import { pathToFileURL } from "node:url";
import { parseEnv } from "node:util";
import { compareObjects } from "./utils.ts";

registerHooks({
	resolve: (specifier, context, nextResolve) => {
		if (specifier.startsWith("cloudflare:"))
			return {
				url: pathToFileURL("./test/empty.cjs").href,
				shortCircuit: true,
			};
		return nextResolve(specifier, context);
	},
});
await suite("Command tests", { concurrency: true }, async () => {
	mock.module("cloudflare:workers", {
		namedExports: {
			env: parseEnv(await readFile(".dev.vars", { encoding: "utf-8" })),
			WorkflowEntrypoint: class {},
			waitUntil: () => {},
		},
	});
	const { CommandHandler } = await import(
		"../src/util/commandHandler/CommandHandler.ts"
	);

	CommandHandler.prototype.verifySignature = (request) => request.json();
	const commands = Object.values(await import("../src/commands/index.ts"));
	const handler = new CommandHandler(commands);
	await Promise.all(
		commands.map((c) =>
			test(c.name, { concurrency: true }, async (t) => {
				await Promise.all(
					c.tests?.map((v) =>
						t.test(v.name, async () => {
							const result = await handler
								.handleInteraction(
									new Request("http://localhost", {
										method: "POST",
										body: JSON.stringify(v.interaction),
									}),
								)
								.catch((e) => (e instanceof Response ? e : Promise.reject(e)));

							if (result.ok) compareObjects(await result.json(), v.response);
							else
								throw new Error(`Response returned ${result.status}`, {
									cause: await result.json(),
								});
						}),
					) ??
						t.skip("No tests") ??
						[],
				);
			}),
		),
	);
});
