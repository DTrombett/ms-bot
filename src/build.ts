import { build, buildSync } from "esbuild";
import { ok } from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, readFileSync } from "node:fs";
import {
	copyFile,
	cp,
	mkdir,
	readdir,
	readFile,
	rename,
	rm,
	writeFile,
} from "node:fs/promises";
import { builtinModules, registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { dirname, extname, join, parse, relative, resolve } from "node:path";
import { cwd, env } from "node:process";
import { pipeline } from "node:stream/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { FunctionComponent } from "react";
import { prerenderToNodeStream } from "react-dom/static";
import { jsx } from "react/jsx-runtime";

console.time("Build");
const isDev = env.WRANGLER_COMMAND === "dev";

if (!isDev) console.log("Registering hooks");
const assets = new Map<string, { virtual: string; physical: string }>();
const cwdPath = cwd();
const imports: Record<string, string[]> = {};
const buildableExtensions = [
	".css",
	".js",
	".ts",
	".tsx",
	".mjs",
	".cjs",
	".jsx",
	".cts",
	".mts",
];
const tsconfigRaw = await readFile("tsconfig.json", "utf8");
registerHooks({
	resolve: (specifier, context, nextResolve) => {
		if (
			(specifier.startsWith("file://") || specifier.startsWith(".")) &&
			!context.parentURL?.includes("/node_modules/")
		) {
			const url = new URL(specifier, context.parentURL).href;

			if (context.parentURL && !context.importAttributes.type)
				(imports[context.parentURL] ??= []).push(url);
			return { url, shortCircuit: true };
		}
		return nextResolve(specifier, context);
	},
	load: (specifier, context, nextLoad) => {
		const { ext } = parse(specifier);

		if (context.importAttributes?.type === "asset") {
			const path = fileURLToPath(specifier);
			let destPath = join(
				cwdPath,
				"build/static",
				relative(join(cwdPath, "src/app"), path),
			);
			const { dir, name, ext } = parse(destPath);
			const value = {
				physical: (destPath = join(
					dir,
					`${name}.${createHash("sha256")
						.update(readFileSync(path))
						.digest("base64url")
						.slice(0, 16)}${ext}`,
				)),
				virtual: `/${relative(join(cwdPath, outdir), destPath).replaceAll("\\", "/")}`,
			};

			if (!buildableExtensions.includes(ext))
				mkdir(dir, { recursive: true })
					.then(copyFile.bind(null, path, destPath, undefined))
					.catch(console.error);
			assets.set(path, value);
			return {
				format: "module",
				shortCircuit: true,
				source: `export default ${JSON.stringify(value.virtual)}`,
			};
		}
		if (
			!specifier.includes("/node_modules/") &&
			specifier.startsWith("file://") &&
			(ext === ".ts" || ext === ".tsx" || ext === "")
		)
			return {
				format: "module",
				shortCircuit: true,
				source: buildSync({
					charset: "utf8",
					entryPoints: [fileURLToPath(specifier)],
					platform: "node",
					sourcemap: "inline",
					target: "node24",
					tsconfigRaw,
					write: false,
				}).outputFiles[0]!.text,
			};
		return nextLoad(specifier, context);
	},
});

const outdir = "build";
if (!isDev && env.WRANGLER_COMMAND !== "types") {
	console.log("Cleaning output directory");
	await Promise.all([
		rm(outdir, { recursive: true, force: true }),
		rm("dist", { recursive: true, force: true }),
	]);
}

if (!isDev) console.log("Copying public assets");
await cp("public", outdir, { recursive: true, force: true });

if (!isDev) console.log("Analyzing imports");
const dir = (
	await readdir("src/app", { recursive: true, withFileTypes: true })
).filter((dirent) => dirent.isFile() && dirent.name.endsWith(".page.tsx"));
const staticPages = (
	await Promise.all(
		dir.map(async (dirent) => {
			let path = resolve(dirent.parentPath, dirent.name);
			const {
				cache,
				default: App,
			}: { cache?: boolean; default: FunctionComponent<{ styles: string[] }> } =
				await import(pathToFileURL(path).href);

			if (cache) {
				const route = relative(join(cwdPath, "src/app"), path)
					.replace(/\.page\.tsx$/, "")
					.replaceAll("\\", "/");

				path = `${join(cwdPath, outdir, route)}.html`;
				await mkdir(dirname(path), { recursive: true });
				return { App, path, route: `/${route}` };
			}
			return;
		}),
	)
).filter((p): p is NonNullable<typeof p> => Boolean(p));

if (!isDev) console.log("Generating hydration files");
const hydratePath = JSON.stringify(resolve("src/app/hydrate.tsx"));
const tmp = tmpdir();
const useClientPath = pathToFileURL("src/app/utils/useClient").href;
const entryPoints = await Promise.all(
	Object.keys(imports)
		.filter((file) => file.endsWith(".page.tsx"))
		.map((file) => {
			const visited = new Set<string>();
			const components = new Set<string>();
			const stack = [file];

			while (stack.length > 0) {
				const current = stack.pop()!;

				if (visited.has(current)) continue;
				visited.add(current);
				if (imports[current]?.includes(useClientPath)) components.add(current);
				for (const child of imports[current] ?? [])
					if (child !== useClientPath && !visited.has(child)) stack.push(child);
			}
			return { components, file };
		})
		.filter(({ components }) => components.size > 0)
		.map(({ components, file }) => ({
			components: Array.from(components, (path) => ({
				path: JSON.stringify(fileURLToPath(path)),
				name: path.match(/\/([^/]+?)(?:\.[^./]+)?$/)![1],
			})),
			file: join(
				tmp,
				"build",
				relative(
					"src/app",
					fileURLToPath(file.replace(/\.page\.tsx$/, ".hydrate.tsx")),
				),
			),
		}))
		.map(async ({ components, file }) => {
			await mkdir(dirname(file), { recursive: true });
			await writeFile(
				file,
				`
					import hydrate from ${hydratePath};
					${components.map(({ name, path }) => `import ${name} from ${path}`).join("\n")}
					hydrate({${components.map(({ name }) => name).join(",")}});
				`,
			);
			return file;
		}),
);

if (!isDev) console.log("Compiling hydration files");
const outbase = join(tmp, "build");
const buildResult = await build({
	bundle: true,
	charset: "utf8",
	entryPoints,
	format: "esm",
	jsx: "automatic",
	legalComments: "inline",
	metafile: true,
	minify: true,
	outbase,
	outdir: `${outdir}/static/js`,
	packages: "bundle",
	platform: "browser",
	publicPath: "/",
	splitting: true,
	target: "es2022",
	treeShaking: true,
	tsconfigRaw,
});
const jsMap = Object.fromEntries(
	await Promise.all(
		Object.entries(buildResult.metafile.outputs)
			.filter(([, { entryPoint }]) => entryPoint)
			.map<Promise<[string, string[]]>>(async ([path, { entryPoint }]) => {
				ok(
					entryPoint && path.endsWith(".hydrate.js"),
					`Path: ${path}, entry point: ${entryPoint}`,
				);
				const hash = createHash("sha256");

				rm(entryPoint, { force: true }).catch(console.error);
				await pipeline(createReadStream(path), hash);
				await rename(
					path,
					(path = path.replace(
						/\.hydrate\.js$/,
						`.${parseInt(hash.digest("hex").slice(0, 10), 16).toString(32).toUpperCase()}.js`,
					)),
				);
				return [
					"/" +
						relative(outbase, entryPoint)
							.replace(/\.hydrate\.tsx$/, "")
							.replaceAll("\\", "/"),
					[path.replace(outdir, "")],
				];
			}),
	),
);

if (!isDev) console.log("Compiling static assets");
await build({
	assetNames: `[dir]/[name].[hash]`,
	bundle: true,
	charset: "utf8",
	format: "esm",
	jsx: "automatic",
	legalComments: "inline",
	metafile: true,
	minify: true,
	outbase: "src/app",
	outdir: `${outdir}/static`,
	packages: "bundle",
	platform: "browser",
	publicPath: "/static",
	splitting: true,
	target: "es2022",
	treeShaking: true,
	tsconfigRaw,
	entryPoints: assets
		.keys()
		.filter((v) => buildableExtensions.includes(extname(v)))
		.toArray(),
	loader: Object.fromEntries(
		[".woff2", ".png", ".jpg", ".avif", ".ttf"].map((f) => [f, "file"]),
	),
	plugins: [
		{
			name: "asset-output",
			setup(build) {
				build.onResolve({ filter: /.*/ }, (args) => {
					const { virtual } =
						assets.get(resolve(args.resolveDir, args.path)) ?? {};

					if (
						virtual &&
						!(build.initialOptions.entryPoints as string[]).includes(args.path)
					)
						return { path: virtual, namespace: "asset-output", external: true };
					return;
				});
				build.onEnd(async (result) => {
					ok(result.metafile);
					await Promise.all(
						Object.entries(result.metafile.outputs).map(
							async ([outPath, meta]) => {
								const path =
									meta.entryPoint ??
									(Object.keys(meta.inputs)[0] as string | undefined);
								if (!path) return;
								const { physical } = assets.get(resolve(path)) ?? {};

								if (physical) await rename(outPath, physical);
							},
						),
					);
				});
			},
		},
	],
	// plugins: [
	// 	{
	// 		name: "static-assets",
	// 		setup: (build) => {
	// 			build.onResolve({ filter: /.*/ }, (args) => {
	// 				if (args.with.type === "asset") {
	// 					console.log(args);
	// 					// return {
	// 					// 	path: args.path,
	// 					// 	namespace: "asset",
	// 					// 	pluginData: args.pluginData,
	// 					// };
	// 				}
	// 			});
	// 			// build.onLoad({ filter: /.*/, namespace: "asset" }, (args) => {
	// 			// 	return { contents };
	// 			// });
	// 		},
	// 	},
	// ],
});

if (!isDev) console.log("Generating static pages");
await Promise.all(
	staticPages.map(async ({ App, path, route }) =>
		pipeline(
			(
				await prerenderToNodeStream(jsx(App, { styles: [] }), {
					bootstrapModules: jsMap[route],
				})
			).prelude,
			createWriteStream(path),
		),
	),
);

if (!isDev) console.log("Building main entry point");
await build({
	banner: {
		js: `import{createRequire}from"module";const require=createRequire(${JSON.stringify(pathToFileURL(join(cwdPath, "dist/index.js")).href)});`,
	},
	bundle: true,
	charset: "utf8",
	conditions: ["module"],
	define: {
		"process.env.NODE_ENV": '"production"',
		"navigator.userAgent": '"Cloudflare-Workers"',
		"globalThis.navigator.userAgent": '"Cloudflare-Workers"',
	},
	entryPoints: ["src/index.tsx"],
	external: ["node:*", "cloudflare:*", ...builtinModules],
	jsx: "automatic",
	legalComments: "none",
	mainFields: ["module"],
	metafile: true,
	minify: true,
	outfile: "dist/index.js",
	packages: "bundle",
	platform: "neutral",
	sourcemap: "linked",
	target: "esnext",
	treeShaking: true,
	tsconfigRaw,
	plugins: [
		{
			name: "build",
			setup: (build) => {
				build.onResolve({ filter: /.*/ }, (args) => {
					if (args.with.type === "asset") {
						const { virtual } =
							assets.get(resolve(args.resolveDir, args.path)) ?? {};

						if (virtual) return { path: virtual, namespace: "static" };
					}
					return;
				});
				build.onResolve({ filter: /build:.+/ }, (args) => ({
					path: args.path.match(/build:(.+)/)![1],
					namespace: "build",
					sideEffects: false,
				}));
				build.onLoad({ filter: /.*/, namespace: "static" }, (args) => ({
					contents: args.path,
					loader: "text",
				}));
				build.onLoad({ filter: /js/, namespace: "build" }, () => ({
					contents: JSON.stringify(jsMap),
					loader: "json",
				}));
				build.onLoad({ filter: /css/, namespace: "build" }, () => ({
					contents: JSON.stringify({}),
					loader: "json",
				}));
			},
		},
	],
});

console.timeEnd("Build");
