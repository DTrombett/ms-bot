import { GlobalFonts } from "@napi-rs/canvas";
import { config } from "dotenv";
import express from "express";
import mongoose from "mongoose";
import { join } from "node:path";
import process, { cwd, env } from "node:process";
import Constants, { CustomClient } from "./util";

CustomClient.printToStdout("Starting...");
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
		CustomClient.printToStdout(`Process exiting with code ${code}...`);
		server.close();
	})
	.on("uncaughtException", (error) => {
		CustomClient.printToStderr(error);
		process.exit(1);
	})
	.on("unhandledRejection", (error) => {
		CustomClient.printToStderr(error);
	})
	.on("warning", (message) => {
		CustomClient.printToStderr(message);
	});
app.use((_, res) => {
	res.sendStatus(204);
});

if (env.NODE_ENV === "development")
	import(`./dev.js?${Date.now()}`)
		.then(({ configureDev }: typeof import("./dev")) => configureDev(client))
		.catch(CustomClient.printToStderr);
for (const font in fonts)
	if (Object.hasOwn(fonts, font))
		GlobalFonts.registerFromPath(
			join(cwd(), "fonts", `${font}.ttf`),
			fonts[font],
		);
await mongoose.connect(env["MONGODB_URL"]!);
await client.login();
