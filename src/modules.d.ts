declare module "build:css" {
	const map: Record<`/${string}`, string[]>;
	export default map;
}
declare module "build:js" {
	const map: Record<`/${string}`, string[]>;
	export default map;
}
declare interface Window {
	CP?: { name: string; props: any; id: string }[];
}

declare module "*.woff2" {
	const filename: string;
	export default filename;
}
declare module "*.png" {
	const filename: string;
	export default filename;
}
declare module "*.jpg" {
	const filename: string;
	export default filename;
}
declare module "*.avif" {
	const filename: string;
	export default filename;
}
declare module "*.css" {
	const filename: string;
	export default filename;
}
declare module "*.ttf" {
	const filename: string;
	export default filename;
}
