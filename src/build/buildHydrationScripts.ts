import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import type { PageData, ResolvedFont } from "./types";
import { cwd, log, outdir, setup, target } from "./utils.ts";

export const buildHydrationScripts = async (
	pages: PageData[],
	tsconfigRaw: string,
	assetsMap: Record<string, string>,
	fonts: Record<string, ResolvedFont>,
) => {
	log("Compiling hydration files");
	const hydratePath = JSON.stringify(resolve("src/app/hydrate.tsx"));
	const o = Object.fromEntries(
		pages
			.filter(({ components }) => components.length)
			.map(({ components, path }) => [
				resolve(path.replace(/\.page\.tsx$/, ".hydrate.ts")),
				`
					import hydrate from ${hydratePath};
					${components.map(({ name, path }) => `import ${name} from ${path}`).join("\n")}
					hydrate({${components.map(({ name }) => name).join(",")}});
				`,
			]),
	);
	const entryPoints = Object.keys(o) as string[];
	const {
		outputFiles,
		metafile: { outputs },
	} = await build({
		bundle: true,
		charset: "utf8",
		chunkNames: "[name].[hash]",
		entryPoints,
		format: "esm",
		jsx: "automatic",
		legalComments: "inline",
		metafile: true,
		minify: true,
		outbase: "src/app",
		outdir: `${outdir}/static/js`,
		packages: "bundle",
		platform: "browser",
		splitting: true,
		target,
		treeShaking: true,
		tsconfigRaw,
		write: false,
		plugins: [
			{
				name: "build",
				setup: (build) => {
					const filter = new RegExp(
						entryPoints.map((e) => RegExp.escape(e)).join("|"),
					);

					build.onResolve({ filter }, (args) => ({ path: args.path }));
					build.onLoad({ filter }, ({ path }) => ({
						contents: o[path],
						resolveDir: dirname(path),
						loader: "ts",
					}));
					setup(build, {
						file: ({ path }) => ({
							contents: JSON.stringify(assetsMap[path]),
							loader: "json",
						}),
						font: ({ path }) => ({
							contents: JSON.stringify(JSON.stringify(fonts[path]!.fontFamily)),
							loader: "json",
						}),
					});
				},
			},
		],
	});
	const jsReverseMap = Object.fromEntries(
		outputFiles.map((outputFile) => {
			const originalPath = outputFile.path;
			const isEntryPoint = originalPath.endsWith(".hydrate.js");

			if (isEntryPoint)
				outputFile.path = outputFile.path.replace(
					/\.js$/,
					`.${Uint8Array.fromBase64(outputFile.hash).toBase64({ alphabet: "base64url", omitPadding: true })}.js`,
				);
			mkdir(dirname(outputFile.path), { recursive: true })
				.then(() => writeFile(outputFile.path, outputFile.contents))
				.catch(console.error);
			return [
				relative(cwd, originalPath).replaceAll("\\", "/"),
				"/" + relative(outdir, outputFile.path).replaceAll("\\", "/"),
			];
		}),
	);
	const jsMap: Record<string, Scripts> = Object.fromEntries(
		pages
			.filter(({ components }) => components.length)
			.map((page): [string, Scripts] => {
				const path = join(
					`${outdir}/static/js`,
					relative("src/app", page.path.replace(/\.page\.tsx$/, ".hydrate.js")),
				).replaceAll("\\", "/");
				const dependencies = new Set<string>();
				const stack = outputs[path]!.imports.slice();

				while (stack.length > 0) {
					const current = stack.pop()!;
					if (!(current.path in jsReverseMap) || dependencies.has(current.path))
						continue;
					dependencies.add(current.path);
					const neighbors = outputs[current.path]?.imports;

					for (const n of neighbors ?? [])
						if (!n.external && !dependencies.has(n.path)) stack.push(n);
				}
				return [
					page.path,
					[
						{ src: jsReverseMap[path]!, module: true, dependency: false },
					].concat(
						Array.from(dependencies, (p) => ({
							src: jsReverseMap[p]!,
							module: true,
							dependency: true,
						})),
					),
				];
			}),
	);

	return { jsMap };
};
