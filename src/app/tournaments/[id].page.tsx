import Participants from "../components/Participants";
import { Page } from "../components/layout";
import lilitaOne from "../fonts/LilitaOne-Regular.ttf" with { type: "asset" };
import nougat from "../fonts/Nougat-Regular.ttf" with { type: "asset" };
import ggsans from "../fonts/ggsansvf.woff2" with { type: "asset" };

export type Participants = (Pick<
	Database.Participant,
	"userId" | "tag" | "team"
> & { name?: Database.SupercellPlayer["name"] | null })[];

export default ({
	admin,
	mobile,
	styles,
	tournament,
	url,
}: {
	admin: boolean;
	mobile: boolean;
	styles?: string[];
	tournament: Database.Tournament & { participants: Participants };
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
			title: tournament.name,
		}}
		url={url}>
		<span
			style={{
				fontFamily: "Nougat",
				fontSize: mobile ? "1.875rem" : "3rem",
				lineHeight: mobile ? "2.25rem" : 1,
				margin: mobile ? "1rem 0" : "1rem 0",
				textAlign: "center",
				userSelect: "none",
				wordSpacing: "-25%",
			}}>
			{tournament.name}
		</span>
		{admin && (
			<Participants
				mobile={mobile}
				participants={tournament.participants}
				id={tournament.id}
			/>
		)}
	</Page>
);
