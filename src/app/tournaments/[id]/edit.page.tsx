import Tournament from "../../components/Tournament";
import { Page } from "../../components/layout";
import lilitaOne from "../../fonts/LilitaOne-Regular.ttf" with { type: "asset" };
import nougat from "../../fonts/Nougat-Regular.ttf" with { type: "asset" };
import ggsans from "../../fonts/ggsansvf.woff2" with { type: "asset" };

export default ({
	mobile,
	modesPromise,
	styles,
	tournament,
	url,
}: {
	mobile: boolean;
	modesPromise: Promise<{ name: string }[] | undefined>;
	styles?: string[];
	tournament: Database.Tournament;
	url: URL;
}) => (
	<Page
		mobile={mobile}
		head={{
			fonts: [
				{ path: nougat, type: "font/ttf" },
				{ path: lilitaOne, type: "font/ttf" },
				ggsans,
			],
			styles,
			title: `${tournament.name} - Modifica`,
		}}
		url={url}>
		<span
			style={{
				fontFamily: "Nougat",
				fontSize: "3rem",
				lineHeight: 1,
				margin: mobile ? "2rem 0" : "1rem 0",
				textAlign: "center",
				userSelect: "none",
			}}>
			MODIFICA TORNEO
		</span>
		<Tournament
			mobile={mobile}
			modesPromise={modesPromise}
			tournament={tournament}
		/>
	</Page>
);
