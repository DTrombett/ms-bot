import { TournamentStatusFlags } from "../../util/Constants";
import Participants from "../components/Participants";
import { Page } from "../components/layout";
import lilitaOne from "../fonts/LilitaOne-Regular.ttf" with { type: "asset" };
import nougat from "../fonts/Nougat-Regular.ttf" with { type: "asset" };
import ggsans from "../fonts/ggsansvf.woff2" with { type: "asset" };

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
	participants,
	url,
}: {
	admin: boolean;
	mobile: boolean;
	styles?: string[];
	tournament: Database.Tournament;
	participants: Participants;
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
				participants={participants}
				id={tournament.id}
			/>
		)}
		{tournament.statusFlags & TournamentStatusFlags.BracketsCreated && (
			<div
				style={{
					backgroundColor: "rgba(63, 63, 70, 0.25)",
					border: "0.8px solid rgba(255, 255, 255, 0.2)",
					borderRadius: "8px",
					display: "flex",
					flexDirection: "column",
					fontFamily: "LilitaOne",
					fontSize: "1.5rem",
					lineHeight: "2rem",
					margin: "0 auto 1.5rem",
					maxWidth: "stretch",
					padding: "1rem 1.25rem 1rem 1rem",
					width: `${13 * Math.ceil(Math.log2(participants.length))}rem`,
					minWidth: "20rem",
				}}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						height: "2.25rem",
					}}>
					<a
						style={{
							marginLeft: "0.25rem",
							color: "currentColor",
							textDecoration: "none",
						}}
						href={`/tournaments/${tournament.id}/brackets`}>
						Brackets
					</a>
				</div>
				<iframe
					loading="lazy"
					style={{ border: "none", width: "stretch", height: "24.625rem" }}
					src={`/tournaments/${tournament.id}/brackets`}
				/>
			</div>
		)}
	</Page>
);
