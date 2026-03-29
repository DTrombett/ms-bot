import { readFile, writeFile } from "node:fs/promises";

const path = "worker-configuration.d.ts";
console.log("Reading", path);
const data = await readFile(path, { encoding: "utf-8" });

console.log("Editing", path);
await writeFile(
	path,
	data
		// Resolve types from source
		.replace(/\.\/dist\//g, "./src/")
		// Use interfaces instead of classes
		.replace(
			/^declare\s+(?:abstract\s+)?class\s+(Cache|CacheStorage|Headers)\s*\{(?:\s*constructor\s*\([^:]+:\s*[^)]+\);?)?/gm,
			"declare interface $1 {",
		)
		// Add extends to Request
		.replace(
			/\binterface\s+Request<([^,]+),\s*Cf(?!\s+extends\s+CfProperties)/,
			"interface Request<$1, Cf extends CfProperties",
		),
);
