import { build, type BuildOptions, type BuildResult } from "esbuild";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
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
const baseOptions = {
	assetNames: `static/[dir]/[name].[hash]`,
	bundle: true,
	charset: "utf8",
	legalComments: "inline",
	metafile: true,
	minify: true,
	outbase: "src/app",
	outdir,
	publicPath: "/",
	treeShaking: true,
	tsconfig: "src/app/tsconfig.json",
} as const satisfies BuildOptions;
await build({
	...baseOptions,
	entryPoints: ["src/app/styles/**/*.css"],
	loader: Object.fromEntries(
		[".woff2", ".png", ".jpg", ".avif", ".ttf", ".js"].map((f) => [f, "file"]),
	),
});
console.log("Compiling tsx and assets");
let buildResult: BuildResult<typeof baseOptions>;
[buildResult] = await Promise.all([
	build({
		...baseOptions,
		entryPoints: ["src/app/**/*.page.tsx"],
		format: "esm",
		jsx: "automatic",
		loader: Object.fromEntries(
			[".css", ".woff2", ".png", ".jpg", ".avif", ".ttf", ".js"].map((f) => [
				f,
				"file",
			]),
		),
		metafile: true,
		packages: "external",
		platform: "node",
		target: "node24",
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
const clientComponents = new Set(
	Object.entries(buildResult.metafile.inputs).flatMap(([k, v]) =>
		v.imports.some((i) => i.path === "src/app/utils/useClient.tsx") ? k : [],
	),
);
const reverseCssMap: Record<string, string> = {};
const staticPages: {
	App: React.FunctionComponent;
	path: string;
	entryPoint: string;
}[] = [];
const toHydrate: string[] = [];
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
		const components = Array.from(
			new Set(Object.keys(v.inputs)).intersection(clientComponents),
			(path) => ({ path, name: path.match(/\/([^./]+)[^/]+$/)![1] }),
		);

		if (components.length) {
			const file = v.entryPoint.replace(/\.page\.tsx$/, ".hydrate.tsx");

			await writeFile(
				file,
				`
				import hydrate from "${pathToFileURL(
					resolve("src/app/hydrate.tsx"),
				).pathname.slice(1)}";
				${components
					.map(
						({ path, name }) =>
							`import ${name} from "${pathToFileURL(resolve(path)).pathname.slice(1)}"`,
					)
					.join("\n")}

				hydrate({${components.map(({ name }) => name).join(",")}});`,
			);
			toHydrate.push(file);
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
console.log("Generating hydration files");
buildResult = await build({
	...baseOptions,
	entryPoints: toHydrate,
	format: "esm",
	jsx: "automatic",
	loader: Object.fromEntries(
		[".woff2", ".png", ".jpg", ".avif", ".ttf", ".css"].map(
			(f) => [f, "file"] as const,
		),
	),
	metafile: true,
	outdir: `${outdir}/static/js`,
	packages: "bundle",
	platform: "browser",
	splitting: true,
	target: "es2022",
	treeShaking: true,
});
console.log("Renaming hydration files");
const jsMap = Object.fromEntries(
	await Promise.all(
		Object.entries(buildResult.metafile.outputs).map(
			async ([path, { entryPoint }]) => {
				const hash = createHash("sha256");

				await pipeline(createReadStream(path), hash);
				await rename(
					path,
					(path = path.replace(
						/\.hydrate\.js$/,
						`.${parseInt(hash.digest("hex").slice(0, 10), 16).toString(32).toUpperCase()}.js`,
					)),
				);
				return [entryPoint!, path.replace(outdir, "")] as const;
			},
		),
	),
);
console.log("Generating static pages");
await Promise.all(
	staticPages.map(async ({ App, path, entryPoint }) => {
		const hydrate = entryPoint.replace(/\.page\.tsx$/, ".hydrate.tsx");
		const bootstrapModule = jsMap[hydrate];
		if (bootstrapModule) delete jsMap[hydrate];
		const { prelude } = await prerenderToNodeStream(
			jsx(App, {
				styles: Array.from(
					inputCssMap.get(entryPoint) ?? [],
					(p) => reverseCssMap[p]!,
				),
			}),
			{ bootstrapModules: bootstrapModule ? [bootstrapModule] : undefined },
		);

		inputCssMap.delete(entryPoint);
		await pipeline(prelude, createWriteStream(path));
	}),
);
console.log("Saving css/js maps and cleaning up");
await Promise.all([
	rm(`${outdir}/styles`, { force: true, recursive: true }),
	writeFile(
		"dist/map.json",
		JSON.stringify({
			css: Object.fromEntries(
				inputCssMap
					.entries()
					.map(([k, v]) => [
						k.replace(/^src\/app\/|\.page\.tsx$/g, ""),
						Array.from(v, (p) => reverseCssMap[p]!),
					]),
			),
			js: Object.fromEntries(
				Object.entries(jsMap).map(([k, v]) => [
					k.replace(/^src\/app\/|\.hydrate\.tsx$/g, ""),
					v,
				]),
			),
		}),
	),
	...toHydrate.map((path) => rm(path, { force: true })),
]);
console.timeEnd("Build");
