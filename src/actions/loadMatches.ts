import { exec as mainExec } from "node:child_process";
import { env, platform } from "node:process";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { MatchDay, MatchDaySchema } from "../models";
import { CustomClient, capitalize, setPermanentTimeout } from "../util";

const exec = promisify(mainExec);
const months = [
	"gen",
	"feb",
	"mar",
	"apr",
	"mag",
	"giu",
	"lug",
	"ago",
	"set",
	"ott",
	"nov",
	"dic",
];

export const loadMatches = async (client: CustomClient) => {
	try {
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
				// This nested async function is made not to stop the loop while reading the matches
				// eslint-disable-next-line @typescript-eslint/no-loop-func
				(async () => {
					const pLocator = locator.locator("p");
					const h3Locator = locator.locator("h3");

					await Promise.all([
						pLocator.nth(1).waitFor(),
						h3Locator.nth(2).waitFor(),
					]);
					const [p, h3] = await Promise.all([
						pLocator.allInnerTexts(),
						h3Locator.allInnerTexts(),
					]);
					const split = p[1].split(" ");
					const hours = split[4].split(":");

					day ??= Number(p[0].split("°")[0]);
					return {
						date: new Date(
							Number(split[2]),
							months.indexOf(split[1].toLowerCase()),
							Number(split[0]),
							Number(hours[0]),
							Number(hours[1]),
							0,
							0,
						).getTime(),
						teams: [h3[0], h3[2]].map((team) =>
							team
								.trim()
								.toLowerCase()
								.split(/\s+/g)
								.map((word) => capitalize(word))
								.join(" "),
						) as [string, string],
					};
				})(),
			);
		const matchDay = new MatchDay({
			matches: await Promise.all(promises),
			day,
		});

		matchDay.matches.sort((a, b) => a.date - b.date);
		browser.close().catch(CustomClient.printToStderr);
		await matchDay.save();
		await setPermanentTimeout(client, {
			action: "loadMatches",
			date: matchDay.matches.at(-1)!.date + 1_000 * 60 * 60 * 24,
			options: [],
		});
	} catch (err) {
		CustomClient.printToStderr(err);
	}
};
