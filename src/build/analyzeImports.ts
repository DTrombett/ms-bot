import { build } from "esbuild";
import { open, type Font } from "fontkit";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { template } from "../util/strings.ts";
import type { PageData, ResolvedFont } from "./types";
import {
	cwd,
	fontExt,
	fontTypes,
	log,
	outdir,
	setup,
	staticDir,
} from "./utils.ts";

export const analyzeImports = async (tsconfigRaw: string) => {
	log("Analyzing imports");
	const fonts: Record<string, ResolvedFont> = {};
	const {
		metafile: { inputs, outputs },
		outputFiles,
	} = await build({
		assetNames: "static/[dir]/[name].[hash]",
		bundle: true,
		charset: "utf8",
		entryPoints: ["src/app/**/*.page.tsx"],
		jsx: "automatic",
		loader: { ...Object.fromEntries(fontExt.map((k) => [k, "file"])) },
		metafile: true,
		outbase: "src/app",
		outdir,
		packages: "external",
		platform: "neutral",
		target: "esnext",
		tsconfigRaw,
		write: false,
		plugins: [
			{
				name: "build",
				setup: (build) => {
					setup(build, {
						css: async ({ path }) => ({
							contents: await readFile(path),
							resolveDir: dirname(path),
							loader: "css",
						}),
						font: async ({ path }) => {
							let resolvedFont = fonts[path];

							if (!resolvedFont) {
								const font = (await open(path)) as Font;

								resolvedFont = fonts[path] = {
									fontFamily: font.familyName,
									italic: Boolean(font.italicAngle),
									weight: font["OS/2"].usWeightClass,
								};
							}
							return {
								contents: `
									import ${JSON.stringify(`${path}.css`)} with { type: "font-face" };
									// Include the quotes in the exported family name
									export default ${JSON.stringify(JSON.stringify(resolvedFont?.fontFamily))};
								`,
								loader: "js",
							};
						},
						fontFace: ({ path }) => {
							const fontPath = path.replace(/\.[^./]+$/, "");
							const font = fonts[fontPath]!;

							return {
								contents: template`
									@font-face {
										font-family: ${JSON.stringify(font.fontFamily)};
										src: url(${JSON.stringify(fontPath)});
										${font.italic}font-style: italic;
										${font.weight !== 400}font-weight: ${font.weight};
										font-display: swap;
									}
								`,
								loader: "css",
								resolveDir: dirname(path),
							};
						},
					});
				},
			},
		],
	});
	const pagesReverseMap = Object.fromEntries(
		Object.values(outputs)
			.filter(({ entryPoint }) => entryPoint)
			.map((out) => [out.entryPoint!, out]),
	);
	const assets = outputFiles.filter((f) => f.path.startsWith(staticDir));
	const pages = Object.keys(inputs)
		.filter(
			(file): file is string =>
				typeof file === "string" && file.endsWith(".page.tsx"),
		)
		.map((file): PageData => {
			const visited = new Set<string>(),
				components = new Set<string>(),
				fonts = new Set<string>(),
				styles = new Set<string>(),
				lazyStyles = new Set<string>();
			const stack = [file];

			while (stack.length > 0) {
				const current = stack.pop()!;

				if (visited.has(current) || !inputs[current]) continue;
				visited.add(current);
				for (const importObj of inputs[current].imports)
					if (importObj.path === "src/app/utils/useClient.tsx")
						components.add(current);
					else if (importObj.path.startsWith("font:"))
						fonts.add(importObj.path.replace(/^font:/, ""));
					else if (importObj.path.startsWith("css:"))
						(importObj.with?.lazy ? lazyStyles : styles).add(
							importObj.path.replace(/^css:/, ""),
						);
				for (const child of inputs[current].imports ?? [])
					if (!child.external) stack.push(child.path);
			}
			return {
				components: Array.from(components, (path) => ({
					path: JSON.stringify(resolve(path)),
					name: path.match(/\/([^/]+?)(?:\.[^./]+)?$/)![1],
				})),
				fonts,
				styles,
				lazyStyles: lazyStyles.difference(styles),
				path: file,
				resolved: resolve(file),
				exports: pagesReverseMap[file]!.exports,
			};
		});
	const assetsMap: Record<string, string> = Object.fromEntries(
		assets.map((f) => [
			resolve(
				String(
					Object.keys(
						outputs[relative(cwd, f.path).replaceAll("\\", "/")]!.inputs,
					)[0],
				).replace(/^[^:/\\]+:/, ""),
			),
			`/${relative(outdir, f.path).replaceAll("\\", "/")}`,
		]),
	);
	const fontsMap: Record<string, Fonts> = Object.fromEntries(
		pages.map((p) => [
			p.path,
			Array.from(p.fonts, (p): Fonts[number] => ({
				src: assetsMap[p]!,
				type: fontTypes[extname(p)],
			})),
		]),
	);

	Promise.all(
		assets.map(async (f) => {
			await mkdir(dirname(f.path), { recursive: true });
			return writeFile(f.path, f.contents);
		}),
	).catch(console.error);
	return { pages, assetsMap, fonts, fontsMap };
};
