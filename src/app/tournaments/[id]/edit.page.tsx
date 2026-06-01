import { env, waitUntil } from "cloudflare:workers";
import { Brawl } from "../../../commands";
import { isAdmin } from "../../../util/token";
import { parseTournamentData } from "../../../util/tournaments/parseTournamentData";
import Tournament from "../../components/Tournament";
import { Page } from "../../components/layout";
import nougat from "../../fonts/Nougat-Regular.ttf";

export const GET: PageHandler = async ({
	authenticate,
	head,
	isMobile,
	params: [id],
	sendPage,
	redirect,
}) => {
	const modesPromise = Brawl.getModes().catch(
		(error) => void console.error(error),
	);
	const token = await authenticate({ force: true });
	if (!(await isAdmin(token))) return sendPage("/403");
	const tournament = await env.DB.prepare(
		`SELECT * FROM Tournaments WHERE id = ?`,
	)
		.bind(Number(id))
		.first<Database.Tournament>();

	if (!tournament) return redirect("/tournaments", 303);
	const mobile = isMobile();
	head.title = `${tournament.name} - Modifica`;
	return (
		<Page>
			<span
				style={{
					fontFamily: nougat,
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
};

export const POST: PageHandler = async ({
	request,
	url,
	params: [id],
	redirect,
	sendPage,
	authenticate,
}) => {
	try {
		const tournament = await parseTournamentData(
			request,
			url.pathname,
			sendPage,
			authenticate,
			redirect,
		);
		const workflowId = await env.DB.prepare(
			`
				UPDATE Tournaments SET
					name = ?, flags = ?, game = ?, logChannel = ?,
					registrationMode = ?, rounds = ?, team = ?, guildId = ?,
					bracketsTime = ?, categoryId = ?, channelName = ?, channelsTime = ?,
					endedCategoryId = ?, endedChannelName = ?, matchMessageLink = ?, minPlayers = ?,
					maxPlayers = ?, registrationChannel = ?, registrationChannelName = ?, registrationEnd = ?,
					registrationTemplateLink = ?, registrationRole = ?, registrationStart = ?, roundType = ?
				WHERE id = ? RETURNING workflowId
			`,
		)
			.bind(
				tournament.name,
				tournament.flags,
				tournament.game,
				tournament.logChannel,
				tournament.registrationMode,
				tournament.rounds,
				tournament.team,
				tournament.guildId,
				tournament.bracketsTime,
				tournament.categoryId,
				tournament.channelName,
				tournament.channelsTime,
				tournament.endedCategoryId,
				tournament.endedChannelName,
				tournament.matchMessageLink,
				tournament.minPlayers,
				tournament.maxPlayers,
				tournament.registrationChannel,
				tournament.registrationChannelName,
				tournament.registrationEnd,
				tournament.registrationTemplateLink,
				tournament.registrationRole,
				tournament.registrationStart,
				tournament.roundType,
				Number(id),
			)
			.first<Database.Tournament["workflowId"]>("workflowId");
		if (workflowId)
			waitUntil(
				env.TOURNAMENT.get(workflowId).then((workflowInstance) =>
					workflowInstance.restart(),
				),
			);
		return redirect("/tournaments", 303);
	} catch (err) {
		console.error(err);
		return redirect(
			`${url.pathname}?error=${encodeURIComponent((err as Error).name)}`,
			303,
		);
	}
};
