import { env } from "cloudflare:workers";
import { isAdmin } from "../util/token";
import { parseTournamentData } from "../util/tournaments/parseTournamentData";
import HomeButton from "./components/HomeButton";
import { Page } from "./components/layout";
import Tournaments from "./components/Tournaments";
import nougat from "./fonts/Nougat-Regular.ttf";
import { Colors } from "./utils/Colors";

export const GET: PageHandler = async ({ head, isMobile, authenticate }) => {
	const token = await authenticate({ force: true });
	const admin = await isAdmin(token);
	const mobile = isMobile();
	const tournaments = (
		token?.i ?
			env.DB.prepare(
				`
					SELECT t.*, p.userId IS NOT NULL AS isRegistered,
						EXISTS (
							SELECT TRUE FROM SupercellPlayers sp
							WHERE sp.userId = ?1 AND active = TRUE
						) AS hasPlayer
					FROM Tournaments t
					LEFT JOIN Participants p ON p.tournamentId = t.id AND p.userId = ?1
				`,
			).bind(token.i)
		:	env.DB.prepare(`SELECT * FROM Tournaments`))
		.run<
			Database.Tournament &
				PossiblyUndefined<{ isRegistered: boolean; hasPlayer: boolean }>
		>()
		.then((r) => r.results);

	head.prefetch = [{ href: "/tournaments/new", as: "document" }];
	head.title = "MS Bot — Tornei";
	return (
		<Page>
			<span
				style={{
					fontFamily: nougat,
					fontSize: "3rem",
					lineHeight: 1,
					paddingTop: mobile ? "2rem" : "1rem",
					textAlign: "center",
					userSelect: "none",
					marginBottom: "1.5rem",
				}}>
				TORNEI
			</span>
			<Tournaments tournaments={tournaments} mobile={mobile} admin={admin} />
			{admin && (
				<HomeButton
					href="/tournaments/new"
					label={mobile ? "+" : "Nuovo torneo"}
					style={{
						backgroundColor: Colors.Primary,
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
};

export const POST: PageHandler = async ({
	request,
	url,
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
		const id = crypto.randomUUID();
		const {
			meta: { last_row_id },
		} = await env.DB.prepare(
			`
				INSERT INTO Tournaments (
					name, flags, game, logChannel, registrationMode, rounds, team,
					guildId, bracketsTime, categoryId, channelName, channelsTime,
					endedCategoryId, endedChannelName, matchMessageLink, minPlayers,
					maxPlayers, registrationChannel, registrationChannelName,
					registrationEnd, registrationTemplateLink, registrationRole,
					registrationStart, roundType, workflowId
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
				id,
			)
			.run();

		await env.TOURNAMENT.create({ id, params: { id: last_row_id } });
		return redirect("/tournaments", 303);
	} catch (err) {
		console.error(err);
		return redirect(
			`/tournaments/new?error=${encodeURIComponent((err as Error).name)}`,
			303,
		);
	}
};
