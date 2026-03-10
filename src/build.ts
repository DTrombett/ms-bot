import { build } from "esbuild";
import { createWriteStream } from "node:fs";
import { cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
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
console.log("Cleaning output directory");
const outdir = "build";
await Promise.all([
	rm(outdir, { recursive: true, force: true }),
	rm("dist", { recursive: true, force: true }),
]);
console.log("Copying static assets");
await cp("public", outdir, { recursive: true, force: true });
console.log("Compiling css");
await build({
	assetNames: `static/[dir]/[name].[hash]`,
	bundle: true,
	charset: "utf8",
	entryPoints: ["src/app/styles/**/*.css"],
	legalComments: "inline",
	loader: Object.fromEntries(
		[".woff2", ".png", ".jpg", ".avif"].map((f) => [f, "file"]),
	),
	metafile: true,
	minify: true,
	outbase: "src/app",
	outdir,
	publicPath: "/",
	treeShaking: true,
	tsconfig: "src/app/tsconfig.json",
});
console.log("Compiling tsx and assets");
const [buildResult] = await Promise.all([
	build({
		assetNames: `static/[dir]/[name].[hash]`,
		bundle: true,
		charset: "utf8",
		entryPoints: ["src/app/**/*.page.tsx"],
		format: "esm",
		jsx: "automatic",
		legalComments: "inline",
		loader: Object.fromEntries(
			[".woff2", ".png", ".jpg", ".avif", ".css"].map((f) => [f, "file"]),
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
	}),
	mkdir(`${outdir}/static/styles`, { recursive: true }),
]);
const inputCssMap = new Map<string, Set<string>>();
const check = (
	imports: { path: string; kind: string }[],
	checked: Set<string>,
	result = new Set<string>(),
) => {
	for (const im of imports) {
		if (im.path.endsWith(".css") && im.kind === "dynamic-import")
			result.add(im.path);
		else if (
			(im.path.endsWith(".ts") || im.path.endsWith(".tsx")) &&
			!checked.has(im.path)
		) {
			checked.add(im.path);
			check(
				buildResult.metafile.inputs[im.path]?.imports ?? [],
				checked,
				result,
			);
		}
	}
	return result;
};
for (const [k, { imports }] of Object.entries(buildResult.metafile.inputs))
	if (k.endsWith(".page.tsx"))
		inputCssMap.set(k, check(imports, new Set<string>(k)));
console.log("Renaming css and dynamic js");
const reverseCssMap: Record<string, string> = {};
const staticPages: {
	App: React.FunctionComponent;
	path: string;
	entryPoint: string;
}[] = [];
await Promise.all(
	Object.entries(buildResult.metafile.outputs).map(async ([k, v]) => {
		if (k.endsWith(".css")) {
			const [oldPath] = Object.keys(v.inputs);

			if (typeof oldPath !== "string" || !oldPath.endsWith(".css")) return;
			await rm(k);
			await rename(oldPath.replace(/^src\/app/, outdir), k);
			reverseCssMap[oldPath] = k.replace(/^[^/]+/, "");
			return;
		}
		if (!v.entryPoint) return;
		if (v.exports.includes("client")) {
			// hydration
		}
		if (v.exports.includes("cache")) {
			const { default: App }: { default: React.FunctionComponent } =
				await import(pathToFileURL(k).href);

			staticPages.push({
				App,
				path: k.replace(/\.page\.js$/, ".html"),
				entryPoint: v.entryPoint,
			});
			await rm(k);
		} else {
			const newPath = k
				.replace(/^[^/]+/, "dist")
				.replace(/([^/]+)\.page\.js$/, "$1.js");

			await mkdir(dirname(newPath), { recursive: true });
			await rename(k, newPath);
		}
	}),
);
console.log("Generating static pages");
await Promise.all(
	staticPages.map(async ({ App, path, entryPoint }) => {
		const { prelude } = await prerenderToNodeStream(
			jsx(App, {
				styles: Array.from(
					inputCssMap.get(entryPoint) ?? [],
					(p) => reverseCssMap[p]!,
				),
			}),
		);

		inputCssMap.delete(entryPoint);
		await pipeline(prelude, createWriteStream(path));
	}),
);
console.log("Saving css map and cleaning up");
await Promise.all([
	rm(`${outdir}/styles`, { force: true, recursive: true }),
	writeFile(
		"dist/cssMap.json",
		JSON.stringify(
			Object.fromEntries(
				inputCssMap
					.entries()
					.map(([k, v]) => [
						k.replace(/^src\/app\/|\.page\.tsx$/g, ""),
						Array.from(v, (p) => reverseCssMap[p]!),
					]),
			),
		),
	),
]);
console.timeEnd("Build");
