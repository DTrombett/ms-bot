import { GlobalFonts } from "@napi-rs/canvas";
import { config } from "dotenv";
import express from "express";
import mongoose from "mongoose";
import { join } from "node:path";
import process, { cwd, env } from "node:process";
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
if (!("DISCORD_TOKEN" in env)) config();
const client = new CustomClient();
const app = express().use((_, res) => {
	res.send(
		client.isReady()
			? `Online! Ping: ${client.ws.ping}ms`
			: "Offline! The bot should be restarting right now, wait around 30 seconds and reload this page...",
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
