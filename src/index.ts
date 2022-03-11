import Constants, { CustomClient } from "./util";

void CustomClient.printToStdout("Starting...");
await CustomClient.logToFile("\n");
console.time(Constants.clientOnlineLabel());

const client = new CustomClient();
(
	global as typeof globalThis & {
		client: CustomClient;
	}
).client = client;

await client.login();
