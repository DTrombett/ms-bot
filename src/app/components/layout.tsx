import type { DetailedHTMLProps, HTMLAttributes, ReactNode } from "react";
import lazyStyles from "../styles/lazy.css";
import useX from "../utils/useX";

export type HeadOptions = {
	children?: ReactNode;
	description?: string;
	fonts?: string[];
	styles: string[];
	title?: string;
};

// So esbuild moves this to the assets directory
useX(import("../styles/global.css"));

export const Head = ({
	children,
	fonts,
	styles,
	description = "Dashboard per interagire con il bot della community MS! Entra nel server Discord tramite l'invito: https://discord.gg/5aE8gdrF8k",
	title = "MS Bot Dashboard",
}: HeadOptions) => (
	<head>
		{children}
		<noscript
			dangerouslySetInnerHTML={{
				__html: `</noscript><link rel="preload" href="${lazyStyles}" as="style" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="${lazyStyles}">`,
			}}
		/>
		{fonts?.map((font) => (
			<link
				rel="preload"
				href={font}
				as="font"
				type="font/woff2"
				key={font}
				crossOrigin="anonymous"
			/>
		))}
		{styles?.map((style) => (
			<link rel="stylesheet" href={style} key={style} />
		))}
		<title>{title}</title>
		<meta name="description" content={description} />
		<meta name="twitter:description" content={description} />
		<meta name="twitter:title" content={title} />
		<meta property="og:description" content={description} />
		<meta property="og:title" content={title} />
		<link rel="author" href="https://github.com/DTrombett" />
		<link rel="icon" href="/favicon.ico" />
		<link rel="manifest" href="/manifest.json" />
		<meta charSet="utf-8" />
		<meta name="application-name" content="MS Bot Dashboard" />
		<meta name="author" content="D Trombett" />
		<meta name="creator" content="D Trombett" />
		<meta name="publisher" content="D Trombett" />
		<meta name="theme-color" content="#0049FF" />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:creator" content="@dtrombett" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta property="og:country_name" content="Italy" />
		<meta property="og:email" content="ms@trombett.org" />
		<meta property="og:locale" content="it" />
		<meta property="og:site_name" content="MS Bot Dashboard" />
		<meta property="og:type" content="website" />
	</head>
);

export const Page = ({
	head,
	children,
	...body
}: { head?: HeadOptions; children?: ReactNode } & DetailedHTMLProps<
	HTMLAttributes<HTMLBodyElement>,
	HTMLBodyElement
>) => (
	<html lang="it">
		<Head {...head} />
		<body {...body}>{children}</body>
	</html>
);
