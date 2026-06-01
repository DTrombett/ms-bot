import { build } from "esbuild";
import { builtinModules } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { PageData, ResolvedFont } from "./types";
import { log, setup } from "./utils.ts";

export const buildMain = async (
	fonts: Record<string, ResolvedFont>,
	tsconfigRaw: string,
	assetsMap: Record<string, string>,
	pages: PageData[],
	jsMap: Record<string, Scripts>,
	cssMap: Record<string, Styles>,
	fontsMap: Record<string, Fonts>,
) => {
	log("Building main entry point");
	await build({
		banner: {
			js: `import{createRequire}from"node:module";const require=createRequire(${JSON.stringify(
				pathToFileURL(resolve("dist/index.js")).href,
			)});`,
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
		keepNames: true,
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
					setup(build, {
						file: ({ path }) => ({
							contents: JSON.stringify(assetsMap[path]),
							loader: "json",
						}),
						font: ({ path }) => ({
							contents: JSON.stringify(JSON.stringify(fonts[path]!.fontFamily)),
							loader: "json",
						}),
						build: {
							routes: () => {
								const routes: Route = {};
								const pathMap: Record<string, string> = {};

								for (const page of pages) {
									const fragments = page.path.split("/").slice(2);
									const lastFragment = fragments
										.pop()!
										.replace(/\.page\.tsx$/, "");
									let currentRoute = routes;

									if (lastFragment !== "index") fragments.push(lastFragment);
									for (const element of fragments)
										currentRoute = currentRoute[element] ??= {};
									pathMap[page.path] = fragments.concat("index").join(".");
									currentRoute.index = {
										scripts: jsMap[page.path] ?? [],
										styles: cssMap[page.path] ?? [],
										fonts: fontsMap[page.path] ?? [],
										methods: {},
									};
								}
								return {
									contents: `
										${pages
											.map(
												(im, i) =>
													`import * as i${i} from ${JSON.stringify(im.resolved)};`,
											)
											.join("")}
										const routes = ${JSON.stringify(routes)};
										${pages
											.flatMap((im, i) =>
												im.exports
													.filter(
														(e) =>
															e.toUpperCase() === e && e.toLowerCase() !== e,
													)
													.map(
														(m) =>
															`routes.${pathMap[im.path]}.methods.${m} = { handler: i${i}.${m} };`,
													),
											)
											.join("")}
										export default routes;
									`,
									loader: "js",
									resolveDir: resolve("src/app"),
								};
							},
						},
					});
				},
			},
		],
	});
};
