import { env } from "cloudflare:workers";
import { textEncoder } from "./globals";

export default async (res: Response) => {
	const body = await res
		.json<
			| { error: string; error_description: string }
			| {
					token_type: string;
					access_token: string;
					expires_in: number;
					refresh_token: string;
					scope: string;
			  }
			| null
		>()
		.catch(() => null);
	if (
		!res.ok ||
		!body ||
		"error" in body ||
		!body.access_token ||
		!body.expires_in
	)
		return {
			error:
				body && "error" in body && body.error ? body.error : "invalid_response",
			error_description:
				body && "error_description" in body && body.error_description ?
					body.error_description
				:	"Il codice di accesso non è valido o è scaduto. Riprova più tardi",
		};
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ciphertext = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		await crypto.subtle.importKey(
			"raw",
			Uint8Array.fromBase64(env.SECRET_KEY),
			{ name: "AES-GCM" },
			false,
			["encrypt"],
		),
		textEncoder.encode(
			JSON.stringify({
				accessToken: body.access_token,
				refreshToken: body.refresh_token,
				scopes: body.scope?.split(" "),
				expires:
					Math.floor(
						(Date.parse(res.headers.get("Date")!) || Date.now()) / 1000,
					) + body.expires_in,
			} satisfies JWT),
		),
	);
	const token = new Uint8Array(iv.length + ciphertext.byteLength);

	token.set(iv, 0);
	token.set(new Uint8Array(ciphertext), iv.length);
	return token.toBase64({ alphabet: "base64url", omitPadding: true });
};
