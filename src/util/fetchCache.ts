import { waitUntil } from "cloudflare:workers";

const blackListedRequestHeaders = ["authorization", "cookie", "x-guest-token"];
const blackListedResponseHeaders = [
	"pragma",
	"expires",
	"set-cookie",
	"cache-control",
];

export const fetchCache = async (
	input: RequestInfo<CfProperties> | URL,
	init: Omit<RequestInit<CfProperties>, "method"> = {},
	ttl: number = 20,
): Promise<Response> => {
	input = input instanceof Request ? input : new Request(input, init);
	const request = input.clone();

	for (const name of blackListedRequestHeaders)
		if (input.headers.has(name)) request.headers.delete(name);
	let response = await caches.default.match(request);
	if (response) {
		const headers = Array.from(response.headers);

		try {
			headers.push(
				...(
					JSON.parse(response.headers.get("x-set-cookie") ?? "[]") as string[]
				).map((c): [string, string] => ["set-cookie", c]),
			);
		} catch (err) {
			console.error(err);
			waitUntil(caches.default.delete(request));
		}
		response = new Response(response.body, {
			cf: response.cf,
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	} else {
		response = await fetch(input);
		const cacheControl = response.headers.get("Cache-Control");

		waitUntil(
			caches.default.put(
				request,
				new Response(response.clone().body, {
					headers: Array.from(response.headers)
						.filter(
							([k]) => !blackListedResponseHeaders.includes(k.toLowerCase()),
						)
						.concat([
							[
								"Cache-Control",
								(
									!cacheControl ||
									cacheControl?.startsWith("no-") ||
									cacheControl?.startsWith("private") ||
									cacheControl?.startsWith("must-")
								) ?
									`public, max-age=${cacheControl?.match(/max-age=(\d+)/)?.[1] ?? ttl}`
								:	cacheControl,
							],
							["x-set-cookie", JSON.stringify(response.headers.getSetCookie())],
						]),
					status: response.status,
					statusText: response.statusText,
				}),
			),
		);
	}
	return response;
};
