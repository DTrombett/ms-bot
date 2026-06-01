import { env } from "cloudflare:workers";
import { TournamentStatusFlags } from "../../util/Constants";
import { isAdmin } from "../../util/token";
import Participants from "../components/Participants";
import { Page } from "../components/layout";
import lilitaOne from "../fonts/LilitaOne-Regular.ttf";
import nougat from "../fonts/Nougat-Regular.ttf";

export type Matches = Pick<
	Database.Match,
	"channelId" | "id" | "result1" | "result2" | "status" | "user1" | "user2"
>[];

export const GET: PageHandler = async ({
	head,
	authenticate,
	params: [id],
	redirect,
	isMobile,
}) => {
	// TODO: Maybe we can Promise.all?
	const token = await authenticate({ force: true });
	const [
		{
			results: [tournament],
		},
		{ results: participants },
	] = (await env.DB.batch([
		env.DB.prepare(`SELECT * FROM Tournaments WHERE id = ?`).bind(Number(id)),
		env.DB.prepare(
			`
				SELECT userId, tag, name
				FROM Participants WHERE tournamentId = ?
			`,
		).bind(Number(id)),
	])) as [
		D1Result<Database.Tournament>,
		D1Result<Pick<Database.Participant, "tag" | "userId" | "name">>,
	];
	if (!tournament) return redirect("/tournaments", 303);
	head.title = tournament.name;
	const mobile = isMobile();

	return (
		<Page>
			<span
				style={{
					fontFamily: nougat,
					fontSize: mobile ? "1.875rem" : "3rem",
					lineHeight: mobile ? "2.25rem" : 1,
					margin: mobile ? "1rem 0" : "1rem 0",
					textAlign: "center",
					userSelect: "none",
					wordSpacing: "-25%",
				}}>
				{tournament.name}
			</span>
			<Participants
				mobile={mobile}
				admin={await isAdmin(token)}
				participants={participants}
				id={tournament.id}
			/>
			{(tournament.statusFlags & TournamentStatusFlags.BracketsCreated) !==
				0 && (
				<div
					style={{
						backgroundColor: "rgba(63, 63, 70, 0.25)",
						border: "0.8px solid rgba(255, 255, 255, 0.2)",
						borderRadius: "8px",
						display: "flex",
						flexDirection: "column",
						fontFamily: lilitaOne,
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
};
