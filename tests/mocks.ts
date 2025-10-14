import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { mock } from "node:test";
import { pathToFileURL } from "node:url";
import { parseEnv } from "node:util";

registerHooks({
	resolve: (specifier, context, nextResolve) =>
		specifier.startsWith("cloudflare:")
			? {
					url: pathToFileURL("./package.json").href,
					importAttributes: { type: "json" },
					shortCircuit: true,
				}
			: nextResolve(specifier, context),
});
mock.module("cloudflare:workers", {
	namedExports: {
		env: parseEnv(await readFile(".test.vars", { encoding: "utf-8" })),
		WorkflowEntrypoint: class {},
		waitUntil: () => {},
	},
});
