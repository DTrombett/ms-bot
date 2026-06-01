import { Page } from "./components/layout";
import LuckiestGuy from "./fonts/LuckiestGuy-Regular.ttf";
import ggsans from "./fonts/ggsansvf.woff2";

export const GET: PageHandler = ({ head }) => {
	head.prefetch = [{ href: "/tournaments", as: "document" }];
	head.title = "Pronostici";
	head.description =
		"Invia e modifica i tuoi pronostici calcistici per divertirti con i risultati sportivi";
	return (
		<Page>
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
						textShadow: "#0049ff 0.25rem 0.25rem",
						fontFamily: LuckiestGuy,
						fontSize: "3rem",
						lineHeight: 1,
						margin: "0.5rem 0",
						textAlign: "center",
					}}>
					Work in progress
				</span>
				<a
					href="/"
					style={{
						fontWeight: 600,
						fontSize: "1.125rem",
						fontFamily: ggsans,
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
};

export const cache = true;
