import { env } from "cloudflare:workers";
import { hexToUint8Array } from "./strings.ts";

export const [spotifyKey, discordKey] = await Promise.all([
	crypto.subtle.importKey(
		"raw",
		Uint8Array.from(atob(env.SPOTIFY_PRIVATE_KEY), (c) => c.charCodeAt(0)),
		{ name: "AES-GCM" },
		false,
		["encrypt", "decrypt"],
	),
	crypto.subtle.importKey(
		"raw",
		hexToUint8Array(env.DISCORD_PUBLIC_KEY),
		"Ed25519",
		false,
		["verify"],
	),
]);
