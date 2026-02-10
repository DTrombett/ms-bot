import { waitUntil } from "cloudflare:workers";

const blackListedRequestHeaders = ["Authorization"];

export const fetchCache = async (
	input: RequestInfo | URL,
	init: RequestInit<RequestInitCfProperties> = {},
	ttl: number = 20,
) => {
	init.cf ??= {};
	init.cf.cacheEverything = true;
	const originalRequest = new Request(input, init);
	const modifiedRequest = originalRequest.clone();

	for (const name of blackListedRequestHeaders)
		if (originalRequest.headers.has(name)) modifiedRequest.headers.delete(name);
	let res = await caches.default.match(modifiedRequest);

	if (!res) {
		res = await fetch(originalRequest);
		const cacheHeader = res.headers.get("Cache-Control");
		const resHeaders = new Headers(res.headers);
		const clonedRes = res.clone();

		if (
			cacheHeader?.startsWith("no-") ||
			cacheHeader?.startsWith("private") ||
			cacheHeader?.startsWith("must-")
		)
			resHeaders.set(
				"Cache-Control",
				`public, max-age=${cacheHeader.match(/max-age=(\d+)/)?.[1] ?? ttl}`,
			);
		waitUntil(
			caches.default.put(
				modifiedRequest,
				new Response(clonedRes.body, { ...clonedRes, headers: resHeaders }),
			),
		);
	}
	return res;
};
