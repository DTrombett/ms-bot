import { APIInteraction } from "discord-api-types/v10";
import nacl from "tweetnacl";
import type { Env } from ".";

const hexToUint8Array = (hex: string) => {
	const length = hex.length / 2;
	const array = new Uint8Array(length);

	for (let i = 0; i < length; i++)
		array[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	return array;
};
let PUBLIC_KEY: Uint8Array | undefined;

export const verifyDiscordRequest = async (request: Request, env: Env) => {
	const signature = request.headers.get("x-signature-ed25519");
	const timestamp = request.headers.get("x-signature-timestamp");
	const body = await request.text();
	const isValidRequest =
		signature &&
		timestamp &&
		nacl.sign.detached.verify(
			new TextEncoder().encode(timestamp + body),
			hexToUint8Array(signature),
			(PUBLIC_KEY ??= hexToUint8Array(env.DISCORD_PUBLIC_KEY)),
		);

	if (!isValidRequest)
		throw new TypeError("Invalid request signature", { cause: request });
	return JSON.parse(body) as APIInteraction;
};
