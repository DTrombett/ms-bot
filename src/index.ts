import { GlobalFonts } from "@napi-rs/canvas";
import { config } from "dotenv";
import express from "express";
import mongoose from "mongoose";
import { join } from "node:path";
import process, { cwd, env, memoryUsage } from "node:process";
import { setInterval } from "node:timers/promises";
import Constants, {
	CustomClient,
	loadPredictions,
	printToStderr,
	printToStdout,
} from "./util";

printToStdout("Starting...");
if (!("DISCORD_TOKEN" in env)) config();
// eslint-disable-next-line no-console
console.time(Constants.clientOnlineLabel);
const client = new CustomClient();
const app = express();
const server = app.listen(3000);
const fonts: Record<string, string> = {
	impact: "Impact",
	arial: "Arial",
	comic: "Comic Sans MS",
	times: "Times New Roman",
	cour: "Courier New",
	verdana: "Verdana",
	georgia: "Georgia",
	gara: "Garamond",
	trebuc: "Trebuchet MS",
};

process
	.on("exit", (code) => {
		printToStdout(`Process exiting with code ${code}...`);
		server.close();
	})
	.on("uncaughtException", (error) => {
		printToStderr(error);
		process.exit(1);
	})
	.on("unhandledRejection", (error) => {
		printToStderr(error);
	})
	.on("warning", (message) => {
		printToStderr(message);
	});
app.use((_, res) => {
	res.sendStatus(204);
});

if (env.NODE_ENV === "development")
	import(`./dev.js?${Date.now()}`)
		.then(({ configureDev }: typeof import("./dev")) => configureDev(client))
		.catch(printToStderr);
for (const font in fonts)
	if (Object.hasOwn(fonts, font))
		GlobalFonts.registerFromPath(
			join(cwd(), "fonts", `${font}.ttf`),
			fonts[font],
		);
await mongoose.connect(env["MONGODB_URL"]!);
await client.login();
await loadPredictions(client);
for await (const _ of setInterval(
	60_000 * (env.NODE_ENV === "production" ? 10 : 1),
)) {
	const memory = memoryUsage();

	printToStdout(
		`RSS: ${(memory.rss / 1000 / 1000).toFixed(3)}MB\nHeap Used: ${(
			memory.heapUsed /
			1000 /
			1000
		).toFixed(3)}MB\nHeap Total: ${(memory.heapTotal / 1000 / 1000).toFixed(
			3,
		)}MB\nExternal: ${(memory.external / 1000 / 1000).toFixed(3)}MB`,
	);
}
