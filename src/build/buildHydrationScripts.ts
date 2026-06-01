import { build } from "esbuild";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
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
	const entryPoints = await Promise.all(
		pages
			.filter(({ components }) => components.length)
			.map(async ({ components, path }) => {
				path = join(
					outdir,
					relative("src/app", path.replace(/\.page\.tsx$/, ".hydrate.tsx")),
				);
				await mkdir(dirname(path), { recursive: true });
				await writeFile(
					path,
					`
						import hydrate from ${hydratePath};
						${components.map(({ name, path }) => `import ${name} from ${path}`).join("\n")}
						hydrate({${components.map(({ name }) => name).join(",")}});
					`,
				);
				return path;
			}),
	);
	const hydrationResult = await build({
		bundle: true,
		charset: "utf8",
		chunkNames: "[name].[hash]",
		entryPoints,
		format: "esm",
		jsx: "automatic",
		legalComments: "inline",
		metafile: true,
		minify: true,
		outbase: outdir,
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

	hydrationResult.outputFiles.map((outputFile) => {
		const path = outputFile.path.replace(
			/\.css$/,
			`.${Uint8Array.fromBase64(outputFile.hash).toBase64({ alphabet: "base64url", omitPadding: true })}.css`,
		);

		writeFile(outputFile.path, outputFile.contents).catch(console.error);
		return [
			join(cwd, "src/app", relative(`${outdir}/static/js`, outputFile.path)),
			path.replace(outdir, ""),
		];
	});

	return {
		jsMap: Object.fromEntries(
			await Promise.all(
				Object.entries(hydrationResult.metafile.outputs)
					.filter(
						(entry): entry is typeof entry & [string, { entryPoint: string }] =>
							entry[1].entryPoint != null,
					)
					.map<Promise<[string, Scripts]>>(async ([path, { entryPoint }]) => {
						const hash = createHash("sha256");

						rm(entryPoint, { force: true }).catch(console.error);
						await pipeline(createReadStream(path), hash);
						await rename(
							path,
							(path = path.replace(
								/\.js$/,
								`.${parseInt(hash.digest("hex").slice(0, 10), 16).toString(32).toUpperCase()}.js`,
							)),
						);
						return [
							entryPoint
								.replace("build", "src/app")
								.replace(/\.hydrate\.tsx$/, ".page.tsx")
								.replaceAll("\\", "/"),
							[path].map((path) => ({
								src: path.replace(outdir, ""),
								module: true,
							})),
						];
					}),
			),
		) satisfies Record<string, Scripts>,
	};
};
