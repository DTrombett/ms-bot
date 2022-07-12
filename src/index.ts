import { config } from "dotenv";
import express from "express";
import process, { env } from "node:process";
import Constants, { CustomClient } from "./util";

CustomClient.printToStdout("Starting...");
if (!("DISCORD_TOKEN" in env)) config();
// eslint-disable-next-line no-console
console.time(Constants.clientOnlineLabel);
const client = new CustomClient();
const app = express();
const server = app.listen(3000);

process
	.on("exit", (code) => {
		CustomClient.printToStdout(`Process exiting with code ${code}...`);
		client.destroy();
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

await client.login();
