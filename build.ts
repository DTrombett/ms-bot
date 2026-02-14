import { readFile, writeFile } from "node:fs/promises";

let path = "node_modules/@discordjs/ws/dist/index.mjs";
let data = await readFile(path, { encoding: "utf-8" });
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
	// // cloudflare/workerd#5822
	// .replace(
	// 	/\bnew WebSocketConstructor\s*\(([^,]+),\s*\[\]/,
	// 	"new WebSocketConstructor($1, undefined",
	// ),
);

path = "node_modules/@cloudflare/playwright/index.d.ts";
data = await readFile(path, { encoding: "utf-8" });
await writeFile(
	path,
	data.replace(/types\/types(["'])/g, "types/types.d.ts$1"),
);
