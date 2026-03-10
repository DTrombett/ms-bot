import Background from "./components/Background";
import { Page } from "./components/layout";
import ggsans from "./fonts/ggsansvf.woff2";

export default ({ cssBundle = CSS_BUNDLE }: { cssBundle?: string }) => (
	<Page
		head={{
			cssBundle,
			children: (
				<>
					<link rel="preload" href={ggsans} as="font" type="font/woff2" />
				</>
			),
		}}
		style={{
			backgroundColor: "rgb(39 39 42)",
			fontFamily: "Roboto",
			display: "flex",
			flexDirection: "column",
			height: "100vh",
			margin: 0,
			color: "white",
			padding: "0 1rem",
		}}>
		<Background />
		<div
			style={{
				alignItems: "center",
				display: "flex",
				flexDirection: "column",
				flex: 1,
				height: "100%",
				justifyContent: "center",
			}}>
			<span
				style={{
					textShadow: "#0049ff 3px 3px",
					fontFamily: "Luckiest Guy",
					fontSize: "3rem",
					lineHeight: 1,
					margin: "0.5rem 0",
					textAlign: "center",
				}}>
				404
				<br />
				NOT FOUND
			</span>
			<a
				href="/"
				style={{
					fontWeight: 600,
					fontSize: "1.125rem",
					fontFamily: "ggsans",
					lineHeight: "1.75rem",
					margin: "0.75rem 0",
					cursor: "pointer",
					color: "#e0e3ff",
					textDecoration: "none",
					borderBottom: "1px solid currentColor",
				}}>
				<span>←</span>
				<span style={{ marginLeft: "1rem" }}>Torna alla home</span>
			</a>
		</div>
	</Page>
);

export const cache = true;
