import HomeButton from "./components/HomeButton";
import { Page } from "./components/layout";
import Tournaments from "./components/Tournaments";
import ggsans from "./fonts/ggsansvf.woff2" with { type: "asset" };
import luckiestGuy from "./fonts/LuckiestGuy-Regular.ttf" with { type: "asset" };

export default ({
	mobile,
	styles,
	url,
	admin,
	tournaments,
}: {
	mobile: boolean;
	styles?: string[];
	url: URL;
	admin: boolean;
	tournaments: Promise<Database.Tournament[]>;
}) => (
	<Page
		mobile={mobile}
		head={{
			fonts: [ggsans, { path: luckiestGuy, type: "font/ttf" }],
			styles,
			prefetch: [{ href: "/tournaments/new", as: "document" }],
		}}
		url={url}>
		<span
			style={{
				fontFamily: "LuckiestGuy",
				fontSize: "4rem",
				lineHeight: 1,
				paddingTop: mobile ? "2rem" : "1rem",
				textAlign: "center",
				textShadow: "#0049ff 0.25rem 0.25rem",
				userSelect: "none",
			}}>
			TORNEI
		</span>
		<Tournaments tournaments={tournaments} mobile={mobile} admin={admin} />
		{admin && (
			<HomeButton
				href="/tournaments/new"
				label={mobile ? "+" : "Nuovo torneo"}
				style={{
					backgroundColor: "#5865f2",
					borderRadius: mobile ? "8px" : "0.5rem",
					bottom: mobile ? "24px" : "2rem",
					fontSize: mobile ? "48px" : "1.5rem",
					fontWeight: mobile ? "normal" : 600,
					lineHeight: mobile ? 1 : "2rem",
					padding: mobile ? "8px 20px" : "0.5rem 1.125rem",
					position: "fixed",
					right: mobile ? "24px" : "2rem",
				}}
			/>
		)}
	</Page>
);
