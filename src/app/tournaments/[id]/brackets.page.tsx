import Brackets from "../../components/Brackets";
import { Page } from "../../components/layout";
import lilitaOne from "../../fonts/LilitaOne-Regular.ttf" with { type: "asset" };
import nougat from "../../fonts/Nougat-Regular.ttf" with { type: "asset" };
import ggsans from "../../fonts/ggsansvf.woff2" with { type: "asset" };

export type Participants = (Pick<Database.Participant, "tag" | "userId"> & {
	name: Database.SupercellPlayer["name"] | null | undefined;
})[];
export type Matches = Pick<
	Database.Match,
	"channelId" | "id" | "result1" | "result2" | "status" | "user1" | "user2"
>[];

export default ({
	admin,
	mobile,
	styles,
	tournament,
	matches,
	participants,
	url,
	embed,
}: {
	admin: boolean;
	mobile: boolean;
	styles?: string[];
	tournament: Pick<Database.Tournament, "name" | "id">;
	matches: Matches;
	participants: Participants;
	url: URL;
	embed: boolean;
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
			title: `${tournament.name} - Brackets`,
		}}
		style={{
			...(embed ?
				{ background: undefined, backgroundColor: undefined }
			:	{ backgroundAttachment: undefined }),
			padding: undefined,
		}}
		url={url}>
		<Brackets
			mobile={mobile}
			participants={participants}
			matches={matches}
			id={tournament.id}
			admin={admin}
			embed={embed}
		/>
	</Page>
);
