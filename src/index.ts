import { GlobalFonts } from "@napi-rs/canvas";
import { config } from "dotenv";
import express from "express";
import mongoose from "mongoose";
import ms from "ms";
import { createWriteStream } from "node:fs";
import { join } from "node:path";
import process, { cwd, env, stderr, stdout } from "node:process";
import Constants, {
	CustomClient,
	loadPredictions,
	logMemoryUsage,
	printToStderr,
	printToStdout,
} from "./util";

printToStdout("Starting...");
// eslint-disable-next-line no-console
console.time(Constants.clientOnlineLabel);
const stream = createWriteStream("./.log", { flags: "a" });
const old = {
	stdout: stdout.write.bind(stdout),
	stderr: stderr.write.bind(stderr),
};

stream.write(`${"_".repeat(80)}\n\n`);
stdout.write = (...args) =>
	old.stdout(...(args as [string])) && stream.write(args[0]);
stderr.write = (...args) =>
	old.stderr(...(args as [string])) && stream.write(args[0]);
if (!("DISCORD_TOKEN" in env)) config();
const client = new CustomClient();
const app = express().use((_, res) => {
	res.send(
		client.isReady()
			? `Online! Ping: ${client.ws.ping}ms, uptime: ${ms(client.uptime, {
					long: true,
			  })}`
			: "Offline! The bot is restarting, wait around 10 seconds and reload this page...",
	);
});
logMemoryUsage().catch(printToStderr);
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
