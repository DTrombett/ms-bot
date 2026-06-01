import { createSolidPng } from "../util/createSolidPng";
import type { RGB } from "../util/resolveColor";

export const GET: PageHandler = ({ url, json, response }) => {
	const rgb = [
		url.searchParams.get("red"),
		url.searchParams.get("green"),
		url.searchParams.get("blue"),
	].map(Number) as RGB;

	if (rgb.some(isNaN))
		return json(
			{ error: "Missing 'red', 'green' or 'blue' query parameter" },
			400,
		);
	response.headers.set("Content-Type", "image/png");
	return createSolidPng(256, 256, ...rgb);
};
