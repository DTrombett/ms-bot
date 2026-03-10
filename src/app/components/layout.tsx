import type { DetailedHTMLProps, HTMLAttributes, ReactNode } from "react";
import "../styles/global.css";

export type HeadOptions = {
	cssBundle: string;
	children?: ReactNode;
	description?: string;
	title?: string;
};

export const Head = ({
	cssBundle,
	children,
	description = "Dashboard per interagire con il bot della community MS! Entra nel server Discord tramite l'invito: https://discord.gg/5aE8gdrF8k",
	title = "MS Bot Dashboard",
}: HeadOptions) => (
	<head>
		{children}
		<noscript
			dangerouslySetInnerHTML={{
				__html: `</noscript><link rel="preload" href="${cssBundle}" as="style" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="${cssBundle}">`,
			}}
		/>
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
