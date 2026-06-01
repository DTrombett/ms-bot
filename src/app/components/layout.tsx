import type { DetailedHTMLProps, HTMLAttributes, ReactNode } from "react";
import background from "../img/background/background.avif" with { type: "image" };
import "../styles/lazy.css" with { lazy: "true" };
import AuthMessage from "./AuthMessage";

export const Head = ({
	description = "Dashboard per interagire con il bot della community MS! Entra nel server Discord tramite l'invito: https://discord.gg/5aE8gdrF8k",
	title = "MS Bot Dashboard",
	prefetch,
	styles,
}: HeadOptions & { styles: Styles }) => (
	<head>
		{styles.map((style) =>
			style.lazy ?
				<noscript
					dangerouslySetInnerHTML={{
						__html: `</noscript><link rel="preload" fetchpriority="low" href="${style.src}" as="style" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="${style.src}">`,
					}}
				/>
			:	<link rel="stylesheet" href={style.src} />,
		)}
		{prefetch?.map((p, i) => (
			<link rel="prefetch" href={p.href} as={p.as} key={i} />
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
	url,
	children,
	...body
}: { url?: URL; children?: ReactNode } & DetailedHTMLProps<
	HTMLAttributes<HTMLBodyElement>,
	HTMLBodyElement
>) => (
	<body
		role="main"
		{...body}
		style={{
			background: `linear-gradient(rgba(39, 39, 42, 0.8), rgba(39, 39, 42, 0.8)), url("${background}"), linear-gradient(rgb(39, 39, 42), rgb(39, 39, 42))`,
			backgroundAttachment: "fixed",
			backgroundColor: "rgb(39, 39, 42)",
			backgroundPosition: "center",
			backgroundSize: "cover",
			color: "white",
			display: "flex",
			flexDirection: "column",
			fontFamily: "Roboto",
			margin: 0,
			minHeight: "100vh",
			padding: "0 1rem",
			textWrap: "balance",
			...body.style,
		}}>
		{children}
		<AuthMessage url={url} />
	</body>
);
