import { build } from "esbuild";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import {
	cp,
	mkdir,
	readFile,
	rename,
	rm,
	unlink,
	writeFile,
} from "node:fs/promises";
import { dirname } from "node:path";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import { prerenderToNodeStream } from "react-dom/static";
import { jsx } from "react/jsx-runtime";

console.time("Build");
{
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
}
console.log("Copying static assets");
const outdir = "build";
await Promise.all([
	rm(outdir, { recursive: true, force: true }),
	rm("dist", { recursive: true, force: true }),
]);
await cp("public", outdir, { recursive: true, force: true });
console.log("Compiling tsx and assets");
const result = await build({
	assetNames: `static/[dir]/[name].[hash]`,
	bundle: true,
	charset: "utf8",
	entryPoints: ["src/app/**/*.page.tsx"],
	format: "esm",
	jsx: "automatic",
	legalComments: "inline",
	loader: Object.fromEntries(
		[".woff2", ".png", ".jpg", ".avif"].map((f) => [f, "file"]),
	),
	metafile: true,
	minify: true,
	outbase: "src/app",
	outdir,
	packages: "external",
	platform: "node",
	publicPath: "/",
	target: "node24",
	treeShaking: true,
	tsconfig: "src/app/tsconfig.json",
});
console.log(
	"Renaming css and dynamic js, creating hydration files and generating static HTML",
);
const cssMap: Record<string, string | null> = {};
await Promise.all(
	Object.entries(result.metafile.outputs).map(async ([k, v]) => {
		if (!v.entryPoint) return;
		if (v.cssBundle) {
			const hash = createHash("sha256");

			await pipeline(createReadStream(v.cssBundle), hash);
			await rename(
				v.cssBundle,
				(v.cssBundle = v.cssBundle
					.replace(outdir, `${outdir}/static`)
					.replace(
						/([^/]+)\.page\.css$/,
						`$1.${parseInt(hash.digest("hex").slice(0, 10), 16).toString(32).toUpperCase()}.css`,
					)),
			);
		}
		if (v.exports.includes("client")) {
			// hydration
		}
		if (v.exports.includes("cache")) {
			const {
				default: App,
			}: { default: React.FunctionComponent<{ cssBundle?: string }> } =
				await import(pathToFileURL(k).href);
			const [{ prelude }] = await Promise.all([
				prerenderToNodeStream(
					jsx(App, { cssBundle: v.cssBundle?.replace(/^[^/]+/, "") }),
				),
				unlink(k),
			]);

			await pipeline(
				prelude,
				createWriteStream(k.replace(/\.page\.js$/, ".html")),
			);
		} else {
			const newPath = k
				.replace(/^[^/]+/, "dist")
				.replace(/([^/]+)\.page\.js$/, "$1.js");

			await mkdir(dirname(newPath), { recursive: true });
			await rename(k, newPath);
			cssMap[k.replace(/^[^/]+\/|\.page\.js$/g, "")] =
				v.cssBundle?.replace(/^[^/]+/, "") ?? null;
		}
	}),
);
console.log("Saving css map");
await writeFile("dist/cssMap.json", JSON.stringify(cssMap));
console.timeEnd("Build");
