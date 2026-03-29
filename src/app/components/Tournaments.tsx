import React, { type CSSProperties } from "react";
import { bitSetMap } from "../../util/bitSets";
import { RegistrationMode } from "../../util/Constants";
import { TimeUnit } from "../../util/time";
import { DiscordLogo } from "./DiscordLogo";
import HomeButton from "./HomeButton";

enum TournamentStatus {
	RegistrationOpen,
	Soon,
	RegistrationClosed,
	Running,
	Unknown,
}
const statusText = [
	"Iscrizioni aperte",
	"Soon™",
	"Iscrizioni chiuse",
	"In corso",
];
const statusColor: CSSProperties["color"][] = [
	"#008545",
	"#5865f2",
	"#D22D39",
	"#5865f2",
];
const gameName = ["Brawl Stars", "Clash Royale"];

const ListElement = ({
	label,
	value,
}: {
	label: string;
	value: React.ReactNode;
}) =>
	value && (
		<>
			<span style={{ fontWeight: 600 }}>{label}</span>: {value}
			<br />
		</>
	);

export default async ({
	tournaments,
	mobile,
	admin,
}: {
	tournaments: Promise<
		(Database.Tournament & { isRegistered?: boolean; hasPlayer?: boolean })[]
	>;
	mobile: boolean;
	admin: boolean;
}) => {
	const now = Date.now() / TimeUnit.Second;

	return (await tournaments).map((t) => {
		const status =
			t.registrationStart && t.registrationStart > now ? TournamentStatus.Soon
			: t.registrationEnd && t.registrationEnd > now ?
				TournamentStatus.RegistrationOpen
			: t.bracketsTime && t.bracketsTime > now ?
				t.registrationStart ?
					TournamentStatus.RegistrationClosed
				:	TournamentStatus.Unknown
			: t.channelsTime ?
				t.channelsTime > now ?
					t.registrationStart ?
						TournamentStatus.RegistrationClosed
					:	TournamentStatus.Unknown
				:	TournamentStatus.Running
			: t.registrationStart ? TournamentStatus.RegistrationClosed
			: TournamentStatus.Unknown;

		return (
			<div
				key={t.id}
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
					padding: "1rem",
					width: "60rem",
				}}>
				<div
					style={{
						display: "flex",
						flexDirection: mobile ? "column" : "row",
						justifyContent: "space-between",
						marginBottom: "0.5rem",
					}}>
					<span>{t.name}</span>
					<span style={{ color: statusColor[status] }}>
						{statusText[status]}
					</span>
				</div>
				<div
					style={{
						fontFamily: "ggsans",
						fontSize: "1rem",
						lineHeight: "normal",
					}}>
					<ListElement label="Gioco" value={gameName[t.game]} />
					<ListElement
						label="Dimensione squadra"
						value={`${t.team}v${t.team}`}
					/>
					<ListElement
						label="Modalità"
						value={Array.from(
							new Set(
								(JSON.parse(t.rounds) as Database.Round[]).map((v) => v.mode),
							),
						).join(", ")}
					/>
					<ListElement
						label="Iscrizioni tramite"
						value={bitSetMap(
							t.registrationMode,
							(bit) => bit && "Discord",
							(bit) => bit && "sito",
						).join(", ")}
					/>
					<ListElement
						label="Minimo giocatori"
						value={t.minPlayers?.toLocaleString("it-IT")}
					/>
					<ListElement
						label="Iscrizioni"
						value={
							t.registrationStart &&
							`${new Date(t.registrationStart * 1000).toLocaleString("it-IT")} ― ${new Date(t.registrationEnd! * 1000).toLocaleString("it-IT")}`
						}
					/>
					<ListElement
						label="Creazione brackets"
						value={
							t.bracketsTime &&
							new Date(t.bracketsTime * 1000).toLocaleString("it-IT")
						}
					/>
					<ListElement
						label="Inizio torneo"
						value={
							t.channelsTime &&
							new Date(t.channelsTime * 1000).toLocaleString("it-IT")
						}
					/>
					<ListElement
						label="Canale iscrizioni"
						value={
							t.registrationChannel && (
								<a
									className="mention"
									href={`${mobile ? "https://discord.com" : "discord://"}/channels/@me/${t.registrationChannel}${t.registrationMessage ? `/${t.registrationMessage}` : ""}`}
									style={{
										color: "#a9bbff",
										cursor: "pointer",
										textDecoration: "none",
										fontWeight: 500,
										borderRadius: "0.25rem",
										backgroundColor: "#5865f23d",
										padding: "0 0.125rem",
										transitionDuration: "0.05s",
										transitionTimingFunction: "ease-out",
									}}>
									<svg
										style={{
											height: "1rem",
											width: "1rem",
											verticalAlign: "middle",
											marginInlineEnd: "0.1rem",
											marginBottom: "0.1rem",
										}}
										aria-label="Channel"
										aria-hidden="false"
										role="img"
										xmlns="http://www.w3.org/2000/svg"
										width="24"
										height="24"
										fill="none"
										viewBox="0 0 24 24">
										<path
											fill="currentColor"
											fill-rule="evenodd"
											d="M10.99 3.16A1 1 0 1 0 9 2.84L8.15 8H4a1 1 0 0 0 0 2h3.82l-.67 4H3a1 1 0 1 0 0 2h3.82l-.8 4.84a1 1 0 0 0 1.97.32L8.85 16h4.97l-.8 4.84a1 1 0 0 0 1.97.32l.86-5.16H20a1 1 0 1 0 0-2h-3.82l.67-4H21a1 1 0 1 0 0-2h-3.82l.8-4.84a1 1 0 1 0-1.97-.32L15.15 8h-4.97l.8-4.84ZM14.15 14l.67-4H9.85l-.67 4h4.97Z"
											clip-rule="evenodd"></path>
									</svg>
									{t.registrationChannelName}
								</a>
							)
						}
					/>
					<div
						style={{
							display: "flex",
							marginTop: "0.75rem",
							justifyContent: "center",
							gap: "0.75rem",
						}}>
						{t.registrationStart &&
							t.registrationStart < now &&
							t.registrationEnd! > now &&
							t.registrationMode & RegistrationMode.Dashboard &&
							t.hasPlayer !== false &&
							(t.isRegistered == null ?
								<HomeButton
									href="/auth/discord/login"
									label="Login"
									icon={
										<DiscordLogo
											style={{
												boxSizing: "content-box",
												display: "inline",
												height: "2rem",
												overflow: "visible",
												verticalAlign: "-0.125em",
												width: "2rem",
											}}
										/>
									}
									style={{ backgroundColor: "#5865f2" }}
								/>
							:	<form
									action={`/tournaments/${t.id}/${
										t.isRegistered ? "unregister" : "register"
									}`}
									method="POST">
									<input
										type="submit"
										className="button"
										value={t.isRegistered ? "Annulla iscrizione" : "Iscriviti"}
										style={{
											backgroundColor: t.isRegistered ? "#D22D39" : "#008545",
											border: "none",
											borderRadius: "0.5rem",
											color: "white",
											cursor: "pointer",
											fontFamily: "ggsans",
											fontSize: "1.125rem",
											fontWeight: 600,
											lineHeight: "1.75rem",
											padding: "0.5rem 1rem",
											textAlign: "center",
											textDecoration: "none",
											userSelect: "none",
										}}
									/>
								</form>)}
					</div>
					{admin && (
						<div
							style={{
								display: "flex",
								marginTop: "0.75rem",
								justifyContent: "center",
								gap: "1rem",
							}}>
							<HomeButton
								label="Gestisci"
								style={{ backgroundColor: "#5865f2", lineHeight: "1.75rem" }}
								href={`/tournaments/${t.id}`}
							/>
							<HomeButton
								label="Modifica"
								style={{ backgroundColor: "#5865f2", lineHeight: "1.75rem" }}
								href={`/tournaments/${t.id}/edit`}
							/>
						</div>
					)}
				</div>
			</div>
		);
	});
};
