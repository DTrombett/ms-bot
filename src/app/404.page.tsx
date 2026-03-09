import background from "./img/background.avif";
import { Page } from "./layout";

export default ({ cssBundle = CSS_BUNDLE }: { cssBundle?: string }) => (
	<Page
		head={{ cssBundle }}
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
		<img
			alt="background"
			loading="lazy"
			width="1090"
			height="613"
			decoding="async"
			style={{
				left: 0,
				opacity: 0.25,
				objectFit: "cover",
				width: "100vw",
				height: "100vh",
				zIndex: -10,
				position: "fixed",
			}}
			src={background}
		/>
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
