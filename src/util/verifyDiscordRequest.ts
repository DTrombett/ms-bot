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
const error = new TypeError("Invalid request signature");
const encoder = new TextEncoder();
let publicKey: Uint8Array | undefined;

export const verifyDiscordRequest = async (request: Request, env: Env) => {
	const bodyPromise = request.text();
	const signature = request.headers.get("x-signature-ed25519");
	const timestamp = request.headers.get("x-signature-timestamp");

	if (!signature || !timestamp) throw error;
	publicKey ??= hexToUint8Array(env.DISCORD_PUBLIC_KEY);
	const sig = hexToUint8Array(signature);
	const body = await bodyPromise;

	if (
		!nacl.sign.detached.verify(encoder.encode(timestamp + body), sig, publicKey)
	)
		throw error;
	return JSON.parse(body) as APIInteraction;
};
