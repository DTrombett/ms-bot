type Fonts = { src: string; type?: string }[];
type Styles = { src: string; lazy: boolean }[];
type Scripts = { src: string; module: boolean }[];
type HeadOptions = Partial<{
	title: string;
	description: string;
	prefetch: Prefetch;
}>;
type PageBody = React.ReactNode | Response | BodyInit | void;
type PageHandler = (ctx: {
	head: HeadOptions;
	params: string[];
	request: Request;
	response: ResponseInit & { headers: Headers };
	url: URL;
	authenticate: {
		(options: { force: true }): Promise<JWT>;
		(options?: Partial<{ force: false }>): Promise<JWT | undefined>;
	};
	isMobile: () => boolean;
	sendPage: (
		path: string,
		options?: Partial<{ method: string }>,
	) => Promise<Response>;
	redirect: (typeof Response)["redirect"];
	json: (data: unknown, status?: number) => Response;
}) => Awaitable<PageBody>;
type Prefetch = { href: string; as: string }[];
type Page = { handler: PageHandler };
type RouteHandler = {
	fonts: Fonts;
	scripts: Scripts;
	styles: Styles;
	methods: Record<string, Page>;
};
type Route = { index?: RouteHandler } & { [x: string]: Route };
type Router = { route: RouteHandler; params: string[] };

declare module "build:routes" {
	const pages: { "404": { index: RouteHandler } } & Route;
	export default pages;
}

//#region Fonts
declare module "*.otf" {
	const familyName: string;
	export default familyName;
}
declare module "*.ttf" {
	const familyName: string;
	export default familyName;
}
declare module "*.woff" {
	const familyName: string;
	export default familyName;
}
declare module "*.woff2" {
	const familyName: string;
	export default familyName;
}
//#endregion

//#region Assets
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
//#endregion

declare module "*.css" {}
