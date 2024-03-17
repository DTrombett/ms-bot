import { APIInteraction } from "discord-api-types/v10";
import nacl from "tweetnacl";
import type { Env } from ".";

export const verifyDiscordRequest = async (request: Request, env: Env) => {
	const signature = request.headers.get("x-signature-ed25519");
	const timestamp = request.headers.get("x-signature-timestamp");
	const body = await request.text();
	const isValidRequest =
		signature &&
		timestamp &&
		nacl.sign.detached.verify(
			Buffer.from(timestamp + body),
			Buffer.from(signature, "hex"),
			Buffer.from(env.DISCORD_PUBLIC_KEY, "hex"),
		);

	if (!isValidRequest)
		throw new TypeError("Invalid request signature", { cause: request });
	return JSON.parse(body) as APIInteraction;
};
