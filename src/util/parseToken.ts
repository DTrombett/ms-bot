import { env } from "cloudflare:workers";
import { textDecoder } from "./globals";

export const parseToken = async (token: string) => {
	const decoded = Uint8Array.fromBase64(token, { alphabet: "base64url" });

	return Object.fromEntries(
		new URLSearchParams(
			textDecoder.decode(
				await crypto.subtle.decrypt(
					{ name: "AES-GCM", iv: decoded.slice(0, 12) },
					await crypto.subtle.importKey(
						"raw",
						Uint8Array.fromBase64(env.SECRET_KEY),
						{ name: "AES-GCM" },
						false,
						["decrypt"],
					),
					decoded.slice(12),
				),
			),
		),
	) as object as JWT;
};
