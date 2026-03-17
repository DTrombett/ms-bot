import { readFile, writeFile } from "node:fs/promises";

const path = "node_modules/@discordjs/ws/dist/index.mjs";
console.log("Reading @discordjs/ws");
const data = await readFile(path, { encoding: "utf-8" });

console.log("Editing @discordjs/ws");
await writeFile(
	path,
	data
		// Don't resolve dirname as Workers do not have fs access
		.replace(/\b(?:var|let|const)\s+__dirname\s*=[^;]+;/, "")
		// Use built-in WebSocket
		.replace(/import\s*{\s*WebSocket\s*}\s*from\s*['"]ws["'];?/, "")
		.replace(
			/\b(var|let|const)\s+WebSocketConstructor\s*=[^;]+;/,
			"$1 WebSocketConstructor = globalThis.WebSocket;",
		),
);
