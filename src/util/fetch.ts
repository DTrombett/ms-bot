import { Buffer } from "node:buffer";
import http from "node:http";
import type { RequestOptions } from "node:https";
import https from "node:https";
import type { RequestResponse, Url } from "./types";
import { ContentType } from "./types";

/**
 * Fetch a URL.
 * @param url - The url to send the request to
 * @param options - The options of the request
 * @returns The response of the request
 */
export const fetch = <R, T extends ContentType>(
	url: Url,
	options: RequestOptions & { type?: T } = {}
) =>
	new Promise<
		RequestResponse<
			T extends ContentType.Buffer
				? R extends Buffer
					? R
					: Buffer
				: T extends ContentType.PlainText
				? R extends string
					? R
					: string
				: R
		>
	>((resolve, reject) => {
		(url.toString().startsWith("https") ? https : http)
			.request(url, options, (res) => {
				let data = "";

				res
					.on("data", (d) => (data += d))
					.once("end", () => {
						const { type = ContentType.PlainText } = options;

						resolve({
							data:
								type === ContentType.Json
									? JSON.parse(data)
									: type === ContentType.Buffer
									? Buffer.from(data)
									: data,
							complete: res.complete,
							headers: res.headers,
							statusCode: res.statusCode!,
							statusMessage: res.statusMessage!,
						});
					})
					.once("error", reject);
			})
			.end();
	});

export default fetch;
