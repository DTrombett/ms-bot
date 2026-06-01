import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { template } from "../util/strings.ts";
import type { PageData, ResolvedFont } from "./types";
import { cwd, log, outdir, target } from "./utils.ts";

export const buildCss = async (
	pages: PageData[],
	tsconfigRaw: string,
	fonts: Record<string, ResolvedFont>,
	assetsMap: Record<string, string>,
) => {
	log("Compiling css files");
	const cssFiles = Array.from(
		pages.reduce(
			(set, { styles, lazyStyles }) => set.union(styles).union(lazyStyles),
			new Set<string>(),
		),
	);
	const { outputFiles } = await build({
		bundle: true,
		charset: "utf8",
		entryPoints: cssFiles.map((e) => e.replace(/^font-face:/, "")),
		external: Object.values(assetsMap),
		legalComments: "inline",
		minify: true,
		outbase: "src/app",
		outdir: `${outdir}/static`,
		platform: "browser",
		target,
		treeShaking: true,
		tsconfigRaw,
		write: false,
		plugins: [
			{
				name: "build",
				setup: (build) => {
					const filter = new RegExp(
						cssFiles
							.filter((e) => e.startsWith("font-face:"))
							.map((e) => RegExp.escape(e.replace(/^font-face:/, "")))
							.join("|"),
					);

					build.onResolve({ filter }, (args) => ({ path: args.path }));
					build.onLoad({ filter }, ({ path }) => {
						path = path.replace(/\.[^./]+$/, "");
						const font = fonts[path]!;

						return {
							contents: template`
								@font-face {
									font-family: ${JSON.stringify(font.fontFamily)};
									src: url(${JSON.stringify(assetsMap[path])});
									${font.italic}font-style: italic;
									${font.weight !== 400}font-weight: ${font.weight};
									font-display: swap;
								}
							`,
							loader: "css",
						};
					});
				},
			},
		],
	});
	const cssReverseMap = Object.fromEntries(
		outputFiles.map((outputFile) => {
			const originalPath = outputFile.path;

			outputFile.path = outputFile.path.replace(
				/\.css$/,
				`.${Uint8Array.fromBase64(outputFile.hash).toBase64({ alphabet: "base64url", omitPadding: true })}.css`,
			);
			mkdir(dirname(outputFile.path), { recursive: true })
				.then(() => writeFile(outputFile.path, outputFile.contents))
				.catch(console.error);
			return [
				join(cwd, "src/app", relative(`${outdir}/static`, originalPath)),
				"/" + relative(outdir, outputFile.path).replaceAll("\\", "/"),
			];
		}),
	);

	return {
		cssMap: Object.fromEntries(
			pages.map((i) => [
				i.path,
				Array.from(i.styles, (v) => ({
					src: cssReverseMap[v.replace(/^font-face:/, "")]!,
					lazy: false,
				})).concat(
					Array.from(i.lazyStyles, (v) => ({
						src: cssReverseMap[v]!,
						lazy: true,
					})),
				),
			]),
		) satisfies Record<string, Styles>,
	};
};
