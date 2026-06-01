import { env } from "cloudflare:workers";
import { textEncoder } from "../../../util/globals";
import { toSearchParams } from "../../../util/objects";
import { TimeUnit } from "../../../util/time";
import {
	createToken,
	parseToken,
	refreshToken,
	updateToken,
} from "../../../util/token";

export const GET: PageHandler = async ({
	url,
	request,
	response,
	redirect,
}) => {
	let r = url.searchParams.get("to") ?? request.headers.get("Referer");
	const scopes = new Set(url.searchParams.get("scope")?.split(" "));

	if (r && URL.canParse(r)) r = new URL(r).pathname;
	scopes.add("identify");
	try {
		const token = await parseToken(
			request.headers.get("cookie")?.match(/(?:^|;\s*)token=([^;]*)/)?.[1],
			scopes,
		);

		if (token && +token.e * 1000 - 5 * TimeUnit.Minute > Date.now()) {
			response.headers.set(
				"Set-Cookie",
				`token=${await createToken(await updateToken(token))}; Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=Lax`,
			);
			return redirect(`${r ?? "/"}?login_success`, 303);
		} else if (token?.r) {
			response.headers.set(
				"Set-Cookie",
				`token=${await createToken(await refreshToken(token.r, true))}; Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=Lax`,
			);
			return redirect(`${r ?? "/"}?login_success`, 303);
		}
	} catch (err) {
		// If no token is present or it's invalid, re-request authorization
	}
	const state = textEncoder
		.encode(toSearchParams({ s: crypto.randomUUID(), r }).toString())
		.toBase64({ alphabet: "base64url", omitPadding: true });
	response.headers.set(
		"Set-Cookie",
		`loginState=${state}; Path=/auth/discord/; HttpOnly; Secure; SameSite=Lax`,
	);
	return redirect(
		`https://discord.com/oauth2/authorize?${new URLSearchParams({
			redirect_uri: new URL("/auth/discord/callback", url).href,
			client_id: env.DISCORD_APPLICATION_ID,
			response_type: "code",
			scope: Array.from(scopes).join(" "),
			prompt: "none",
			state,
		}).toString()}`,
		302,
	);
};
