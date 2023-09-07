import { exec as mainExec } from "node:child_process";
import { env, platform } from "node:process";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { MatchDay, MatchDaySchema } from "../models";
import { CustomClient, setPermanentTimeout } from "../util";

const exec = promisify(mainExec);
const months = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

export const loadMatches = async (client: CustomClient) => {
	const browser = await chromium.launch({
		executablePath:
			platform === "linux" && env.NODE_ENV === "production"
				? (await exec("whereis chromium")).stdout.split(":")[1].trim()
				: undefined,
	});
	const page = await browser.newPage();
	const rows = page.locator(".hm-row-schedule");
	const promises: Promise<MatchDaySchema["matches"][number]>[] = [];
	let day: number | undefined;

	await page.goto("https://www.legaseriea.it/it/serie-a");
	await rows.first().waitFor();
	for (const locator of await rows.all())
		promises.push(
			// eslint-disable-next-line @typescript-eslint/no-loop-func
			(async () => {
				const [p, h3] = await Promise.all([
					locator.locator("p").allInnerTexts(),
					locator.locator("h3").allInnerTexts(),
				]);
				const teams = [h3[0].toLowerCase(), h3[2].toLowerCase()] as const;
				const split = p[1].split(" ");
				const minutes = split[4].split(":");
				const date = new Date();

				day ??= Number(p[0].split("°")[0]);
				date.setFullYear(
					Number(split[2]),
					months.indexOf(split[1].toLowerCase()),
					Number(split[0]),
				);
				date.setHours(Number(minutes[0]), Number(minutes[1]), 0, 0);
				return { date: date.getTime(), teams };
			})(),
		);
	const matchDay = new MatchDay({ day, matches: await Promise.all(promises) });

	matchDay.matches.sort((a, b) => a.date - b.date);
	await Promise.all([
		browser.close(),
		matchDay.save(),
		setPermanentTimeout(client, {
			action: "loadMatches",
			date: matchDay.matches.at(-1)!.date + 1_000 * 60 * 60 * 24,
			options: [],
		}),
	]);
};
