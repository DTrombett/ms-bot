import HomeButton from "./components/HomeButton";
import { Page } from "./components/layout";
import ggsans from "./fonts/ggsansvf.woff2";
import luckiestGuy from "./fonts/LuckiestGuy-Regular.ttf";

export default ({
	mobile,
	styles,
	url,
	admin,
}: {
	mobile: boolean;
	styles: string[];
	url: URL;
	admin: boolean;
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
