declare const CSS_BUNDLE: string;

declare interface Window {
	PROPS?: object;
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
