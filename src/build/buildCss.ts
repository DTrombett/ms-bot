import { build } from "esbuild";
import { writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { PageData } from "./types";
import { cwd, log, outdir, target } from "./utils.ts";

export const buildCss = async (pages: PageData[], tsconfigRaw: string) => {
	log("Compiling css files");
	const { outputFiles } = await build({
		bundle: true,
		charset: "utf8",
		entryPoints: Array.from(
			pages.reduce(
				(set, { styles, lazyStyles }) => set.union(styles).union(lazyStyles),
				new Set<string>(),
			),
		),
		legalComments: "inline",
		metafile: true,
		minify: true,
		outbase: "src/app",
		outdir: `${outdir}/static`,
		platform: "browser",
		target,
		treeShaking: true,
		tsconfigRaw,
		write: false,
	});
	const cssReverseMap = Object.fromEntries(
		outputFiles.map((outputFile) => {
			const originalPath = outputFile.path;

			outputFile.path = outputFile.path.replace(
				/\.css$/,
				`.${Uint8Array.fromBase64(outputFile.hash).toBase64({ alphabet: "base64url", omitPadding: true })}.css`,
			);
			writeFile(outputFile.path, outputFile.contents).catch(console.error);
			return [
				join(cwd, "src/app", relative(`${outdir}/static`, originalPath)),
				outputFile.path.replace(outdir, ""),
			];
		}),
	);

	return {
		cssMap: Object.fromEntries(
			pages.map((i) => [
				i.path,
				Array.from(i.styles, (v) => ({
					src: cssReverseMap[v]!,
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
