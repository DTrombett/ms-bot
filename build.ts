import { readFile, writeFile } from "node:fs/promises";

const path = "node_modules/@discordjs/ws/dist/index.mjs";
const data = await readFile(path, { encoding: "utf-8" });

await writeFile(
	path,
	data
		.replace(/\b(?:var|let|const)\s+__dirname\s*=[^;]+;/, "")
		.replace(
			/\b(var|let|const)\s+WebSocketConstructor\s*=[^;]+;/,
			"$1 WebSocketConstructor = globalThis.WebSocket;",
		)
		.replace(
			/\bnew WebSocketConstructor\s*\(([^,]+),\s*\[\]/,
			"new WebSocketConstructor($1, undefined",
		),
);
