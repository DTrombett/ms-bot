import { APIInteraction } from "discord-api-types/v10";
import type { Env } from ".";

const hexToUint8Array = (hex: string) =>
	new Uint8Array(hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
const verifySignature = async (
	keyData: ArrayBuffer | ArrayBufferView | JsonWebKey,
	signature: ArrayBuffer | ArrayBufferView,
	data: ArrayBuffer | ArrayBufferView,
) =>
	crypto.subtle.verify(
		"Ed25519",
		await crypto.subtle.importKey("raw", keyData, "Ed25519", false, ["verify"]),
		signature,
		data,
	);
const encoder = new TextEncoder();
let keyData: Uint8Array | undefined;

export const verifyDiscordRequest = async (request: Request, env: Env) => {
	const bodyPromise = request.text();
	const signature = request.headers.get("x-signature-ed25519");
	const timestamp = request.headers.get("x-signature-timestamp");

	if (!signature || !timestamp)
		return new Response("Invalid request signature", { status: 401 });
	keyData ??= hexToUint8Array(env.DISCORD_PUBLIC_KEY);
	const sig = hexToUint8Array(signature);
	const body = await bodyPromise;

	if (!(await verifySignature(keyData, sig, encoder.encode(timestamp + body))))
		return new Response("Invalid request signature", { status: 401 });
	return JSON.parse(body) as APIInteraction;
};
