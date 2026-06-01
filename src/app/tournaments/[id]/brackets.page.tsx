import { env } from "cloudflare:workers";
import { isAdmin } from "../../../util/token";
import Brackets from "../../components/Brackets";
import { Page } from "../../components/layout";

export const GET: PageHandler = async ({
	head,
	authenticate,
	params: [id],
	redirect,
	isMobile,
	request,
	url,
}) => {
	const [
		admin,
		[
			{
				results: [tournament],
			},
			{ results: matches },
			{ results: participants },
		],
	] = await Promise.all([
		authenticate().then(isAdmin),
		env.DB.batch([
			env.DB.prepare(`SELECT name, id FROM Tournaments WHERE id = ?`).bind(
				Number(id),
			),
			env.DB.prepare(
				`
						SELECT channelId, id, result1,
							result2, status, user1, user2
						FROM Matches WHERE tournamentId = ?
					`,
			).bind(Number(id)),
			env.DB.prepare(
				`
						SELECT userId, tag, name
						FROM Participants WHERE tournamentId = ?
					`,
			).bind(Number(id)),
		]) as Promise<
			[
				D1Result<Pick<Database.Tournament, "name" | "id">>,
				D1Result<
					Pick<
						Database.Match,
						| "channelId"
						| "id"
						| "result1"
						| "result2"
						| "status"
						| "user1"
						| "user2"
					>
				>,
				D1Result<Pick<Database.Participant, "tag" | "userId" | "name">>,
			]
		>,
	]);
	if (!tournament) return redirect("/tournaments", 303);
	head.title = `${tournament.name} - Brackets`;
	// TODO: Add utility isIframe
	const embed = request.headers.get("sec-fetch-dest") === "iframe";
	const mobile = isMobile();

	return (
		<Page
			style={{
				...(embed ?
					{ background: undefined, backgroundColor: undefined }
				:	{ backgroundAttachment: undefined }),
				padding: undefined,
			}}>
			<Brackets
				admin={admin}
				id={tournament.id}
				matches={matches}
				mobile={mobile}
				participants={participants}
				query={url.searchParams}
				embed={embed}
			/>
		</Page>
	);
};
