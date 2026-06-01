import { analyzeImports } from "./analyzeImports.ts";
import { buildCss } from "./buildCss.ts";
import { buildHydrationScripts } from "./buildHydrationScripts.ts";
import { buildMain } from "./buildMain.ts";
import { clean } from "./clean.ts";
import { copyPublic } from "./copyPublic.ts";
import { initialize } from "./initialize.ts";

console.time("Build");
const [{ tsconfigRaw }] = await Promise.all([
	initialize(),
	clean().then(copyPublic),
]);
const { assetsMap, fonts, fontsMap, pages } = await analyzeImports(tsconfigRaw);
const [{ cssMap }, { jsMap }] = await Promise.all([
	buildCss(pages, tsconfigRaw, fonts, assetsMap),
	buildHydrationScripts(pages, tsconfigRaw, assetsMap, fonts),
]);

await buildMain(fonts, tsconfigRaw, assetsMap, pages, jsMap, cssMap, fontsMap);
console.timeEnd("Build");

// const dir = (
// 	await readdir("src/app", { recursive: true, withFileTypes: true })
// ).filter((dirent) => dirent.isFile() && dirent.name.endsWith(".page.tsx"));
// const staticPages = (
// 	await Promise.all(
// 		dir.map(async (dirent) => {
// 			let path = resolve(dirent.parentPath, dirent.name);
// 			const {
// 				cache,
// 				default: App,
// 			}: { cache?: boolean; default: FunctionComponent<{ styles: string[] }> } =
// 				await import(pathToFileURL(path).href);

// 			if (cache) {
// 				const route = relative(join(cwdPath, "src/app"), path)
// 					.replace(/\.page\.tsx$/, "")
// 					.replaceAll("\\", "/");

// 				path = `${join(cwdPath, outdir, route)}.html`;
// 				await mkdir(dirname(path), { recursive: true });
// 				return { App, path, route: `/${route}` };
// 			}
// 			return;
// 		}),
// 	)
// ).filter((p): p is NonNullable<typeof p> => Boolean(p));

// log("Generating hydration files");
// const tmp = tmpdir();
// const useClientPath = pathToFileURL("src/app/utils/useClient").href;

// log("Compiling hydration files");
// const outbase = join(tmp, "build");
// const jsMap = Object.fromEntries(
// 	await Promise.all(
// 		Object.entries(buildResult.metafile.outputs)
// 			.filter(([, { entryPoint }]) => entryPoint)
// 			.map<Promise<[string, string[]]>>(async ([path, { entryPoint }]) => {
// 				ok(
// 					entryPoint && path.endsWith(".hydrate.js"),
// 					`Path: ${path}, entry point: ${entryPoint}`,
// 				);
// 				const hash = createHash("sha256");

// 				rm(entryPoint, { force: true }).catch(console.error);
// 				await pipeline(createReadStream(path), hash);
// 				await rename(
// 					path,
// 					(path = path.replace(
// 						/\.hydrate\.js$/,
// 						`.${parseInt(hash.digest("hex").slice(0, 10), 16).toString(32).toUpperCase()}.js`,
// 					)),
// 				);
// 				return [
// 					"/" +
// 						relative(outbase, entryPoint)
// 							.replace(/\.hydrate\.tsx$/, "")
// 							.replaceAll("\\", "/"),
// 					[path].map((path) => path.replace(outdir, "")),
// 				];
// 			}),
// 	),
// );

// log("Compiling static assets");
// await build({
// 	assetNames: `[dir]/[name].[hash]`,
// 	bundle: true,
// 	charset: "utf8",
// 	format: "esm",
// 	jsx: "automatic",
// 	legalComments: "inline",
// 	metafile: true,
// 	minify: true,
// 	outbase: "src/app",
// 	outdir: `${outdir}/static`,
// 	packages: "bundle",
// 	platform: "browser",
// 	publicPath: "/static",
// 	splitting: true,
// 	target: "es2022",
// 	treeShaking: true,
// 	tsconfigRaw,
// 	entryPoints: assets
// 		.keys()
// 		.filter((v) => buildableExtensions.includes(extname(v)))
// 		.toArray(),
// 	loader: Object.fromEntries(
// 		[".woff2", ".png", ".jpg", ".avif", ".ttf"].map((f) => [f, "file"]),
// 	),
// 	plugins: [
// 		{
// 			name: "asset-output",
// 			setup(build) {
// 				build.onResolve({ filter: /.*/ }, (args) => {
// 					const { virtual } =
// 						assets.get(resolve(args.resolveDir, args.path)) ?? {};

// 					if (
// 						virtual &&
// 						!(build.initialOptions.entryPoints as string[]).includes(args.path)
// 					)
// 						return { path: virtual, namespace: "asset-output", external: true };
// 					return;
// 				});
// 				build.onEnd(async (result) => {
// 					ok(result.metafile);
// 					await Promise.all(
// 						Object.entries(result.metafile.outputs).map(
// 							async ([outPath, meta]) => {
// 								const path =
// 									meta.entryPoint ??
// 									(Object.keys(meta.inputs)[0] as string | undefined);
// 								if (!path) return;
// 								const { physical } = assets.get(resolve(path)) ?? {};

// 								if (physical) await rename(outPath, physical);
// 							},
// 						),
// 					);
// 				});
// 			},
// 		},
// 	],
// 	// plugins: [
// 	// 	{
// 	// 		name: "static-assets",
// 	// 		setup: (build) => {
// 	// 			build.onResolve({ filter: /.*/ }, (args) => {
// 	// 				if (args.with.type === "asset") {
// 	// 					console.log(args);
// 	// 					// return {
// 	// 					// 	path: args.path,
// 	// 					// 	namespace: "asset",
// 	// 					// 	pluginData: args.pluginData,
// 	// 					// };
// 	// 				}
// 	// 			});
// 	// 			// build.onLoad({ filter: /.*/, namespace: "asset" }, (args) => {
// 	// 			// 	return { contents };
// 	// 			// });
// 	// 		},
// 	// 	},
// 	// ],
// });

// log("Generating static pages");
// await Promise.all(
// 	staticPages.map(async ({ App, path, route }) =>
// 		pipeline(
// 			(
// 				await prerenderToNodeStream(jsx(App, { styles: [] }), {
// 					bootstrapModules: jsMap[route],
// 				})
// 			).prelude,
// 			createWriteStream(path),
// 		),
// 	),
// );
