import { build } from "esbuild";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import {
	mkdir,
	readdir,
	readFile,
	rename,
	rm,
	writeFile,
} from "node:fs/promises";
import { join, parse, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";

const path = "node_modules/@discordjs/ws/dist/index.mjs";
console.log("Reading", path);
const data = await readFile(path, { encoding: "utf-8" });
console.log("Writing", path);
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
console.log("Cleaning output dir and reading app directory");
const [files] = await Promise.all([
	readdir("app", { withFileTypes: true, recursive: true }),
	rm("dist", { recursive: true, force: true }),
]);
const entries: string[] = [];
const toHydrate: string[] = [];
const outMap: Record<string, string> = {};
const fileExtensions = [".woff2"];
const hydratePath = pathToFileURL(
	resolve("app/utils/hydrate.tsx"),
).pathname.slice(1);
console.log("Copying assets");
await Promise.all(
	files.map(async (e) => {
		e.parentPath = e.parentPath.replace(/^app[/\\]?/, "");
		if (
			!e.isFile() ||
			e.parentPath.startsWith("utils") ||
			e.name === "tsconfig.json"
		)
			return;
		const { name, ext } = parse(e.name);
		const path = join("app", e.parentPath, e.name);

		if ([".css"].includes(ext)) {
			entries.push(path);
			return;
		}
		if (ext === ".tsx") {
			const outdir = join("tmp", e.parentPath);
			const file = join(outdir, e.name);

			await mkdir(outdir, { recursive: true });
			await writeFile(
				file,
				`
					import hydrate from "${hydratePath}";
					import App from "${pathToFileURL(path).pathname.slice(1)}";

					hydrate(App);
				`,
			);
			toHydrate.push(file);
			return;
		}
		if (fileExtensions.includes(ext)) return;
		const hash = createHash("sha256");
		await Promise.all([
			pipeline(createReadStream(path), hash),
			mkdir(join("dist", e.parentPath), { recursive: true }),
		]);
		const outFile = join(
			e.parentPath,
			`${name}.${hash.digest("base64url")}${ext}`,
		);
		outMap[join(e.parentPath, e.name).replaceAll("\\", "/")] = outFile;
		return pipeline(
			createReadStream(path),
			createWriteStream(join("dist", outFile)),
		);
	}),
);
console.log("Compiling files");
const result = await build({
	assetNames: "[dir]/[name].[hash]",
	bundle: true,
	charset: "utf8",
	entryPoints: entries,
	format: "esm",
	legalComments: "inline",
	loader: Object.fromEntries(fileExtensions.map((f) => [f, "file"])),
	metafile: true,
	minify: true,
	outbase: "app",
	outdir: "dist",
	platform: "browser",
	splitting: true,
	target: "es2020",
	treeShaking: true,
	tsconfig: "app/tsconfig.json",
});
console.log("Renaming output files");
await Promise.all(
	Object.entries(result.metafile.outputs).map(async ([k, v]) => {
		if (v.entryPoint) {
			const hash = createHash("sha256");
			const { name, ext } = parse(k);
			await pipeline(createReadStream(k), hash);
			const newPath = join(
				k,
				"..",
				`${name}.${hash.digest("base64url")}${ext}`,
			);

			outMap[v.entryPoint.replace(/^app[/\\]?/, "")] = newPath.replace(
				/^dist[/\\]?/,
				"",
			);
			await rename(k, newPath);
		}
	}),
);
await build({
	bundle: true,
	charset: "utf8",
	define: { ASSETS: JSON.stringify(outMap) },
	entryPoints: toHydrate,
	format: "esm",
	jsx: "automatic",
	legalComments: "inline",
	metafile: true,
	minify: true,
	outbase: "tmp",
	outdir: "dist",
	platform: "browser",
	splitting: true,
	target: "es2020",
	treeShaking: true,
	tsconfig: "app/tsconfig.json",
});
console.log(outMap);
