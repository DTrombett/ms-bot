import type {
	APIApplicationCommandAutocompleteInteraction,
	APIApplicationCommandInteraction,
	APIInteractionResponse,
	APIMessageComponentInteraction,
	APIModalSubmitInteraction,
} from "discord-api-types/v10";
import "./mocks.ts";

import { deepStrictEqual } from "node:assert/strict";
import { mock } from "node:test";

const [{ CommandHandler }, commandsObject] = await Promise.all([
	import("../src/util/CommandHandler.ts"),
	import("../src/commands/index.ts"),
]);

const commands = Object.values(commandsObject);
export const handler = new CommandHandler(commands);
mock.method(handler, "verifySignature", (r: Request) => r.json());
export const assertInteraction = async (
	interaction: Partial<
		| APIApplicationCommandAutocompleteInteraction
		| APIApplicationCommandInteraction
		| APIMessageComponentInteraction
		| APIModalSubmitInteraction
	>,
	response: APIInteractionResponse,
) => {
	const result = await handler
		.handleInteraction(
			new Request(new URL("http://test"), {
				method: "POST",
				body: JSON.stringify(interaction),
			}),
		)
		.catch((e) => (e instanceof Response ? e : Promise.reject(e)));

	if (result.ok) deepStrictEqual(await result.json(), response);
	else
		throw new Error(`Response returned ${result.status}`, {
			cause: await result.json(),
		});
};
