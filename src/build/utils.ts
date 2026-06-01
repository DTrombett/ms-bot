import type { PluginBuild } from "esbuild";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { env, cwd as getCwd } from "node:process";
import type { PluginLoadCallback } from "./types";

export const fontTypes: Record<string, string> = {
	".ttf": "truetype",
	".otf": "opentype",
	".woff": "woff",
	".woff2": "woff2",
};

export const fontExt = Object.keys(fontTypes);

export const target = [
	"chrome94",
	"edge94",
	"firefox93",
	"safari17",
	"opera80",
];

export const outdir = "build";

export const cwd = getCwd();

export const staticDir = resolve(outdir, "static");

export const log = (...data: unknown[]) => {
	if (env.WRANGLER_COMMAND !== "dev") console.log(...data);
};

export const setup = (
	build: PluginBuild,
	{
		css = () => ({ contents: "", loader: "empty" }),
		file = async ({ path }) => ({
			contents: await readFile(path),
			loader: "file",
		}),
		fontFace = () => ({ contents: "", loader: "empty" }),
		font,
		build: buildLoaders,
	}: Partial<
		Record<"file" | "css" | "font" | "fontFace", PluginLoadCallback> & {
			build: Record<string, PluginLoadCallback>;
		}
	>,
) => {
	build.onResolve({ filter: /.*/ }, (args) => {
		if (args.importer.includes("/node_modules/")) return;
		if (args.path.startsWith("build:"))
			return {
				namespace: "build",
				pluginName: "build",
				path: args.path.slice(6),
			};
		let { type } = args.with;

		if (!type) {
			const ext = extname(args.path);

			if (ext === ".css") type = "css";
			else if (
				fontExt.includes(ext) &&
				[".tsx", ".ts", ".mts", ".mjs", ".jsx", ".js", ".cts", ".cjs"].includes(
					extname(args.importer),
				)
			)
				type = "font";
		}
		if (type)
			return { namespace: type, path: join(args.resolveDir, args.path) };
		return;
	});
	if (file) {
		build.onLoad({ filter: /.*/, namespace: "asset" }, file);
		build.onLoad({ filter: /.*/, namespace: "image" }, file);
	}
	if (css) build.onLoad({ filter: /.*/, namespace: "css" }, css);
	if (font) build.onLoad({ filter: /.*/, namespace: "font" }, font);
	if (buildLoaders)
		for (const [string, callback] of Object.entries(buildLoaders))
			build.onLoad(
				{ filter: new RegExp(RegExp.escape(string)), namespace: "build" },
				callback,
			);
	if (fontFace)
		build.onLoad({ filter: /.*/, namespace: "font-face" }, fontFace);
};
