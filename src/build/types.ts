import type { PluginBuild } from "esbuild";

export type ResolvedFont = {
	fontFamily: string;
	italic: boolean;
	weight: number;
};

export type PluginLoadCallback = Parameters<PluginBuild["onLoad"]>[1];

export type PageData = {
	components: { path: string; name?: string }[];
	fonts: Set<string>;
	styles: Set<string>;
	lazyStyles: Set<string>;
	path: string;
	resolved: string;
	exports: string[];
};
