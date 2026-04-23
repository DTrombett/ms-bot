import React, { type CSSProperties } from "react";
import { bitSetMap } from "../../util/bitSets";
import { RegistrationMode, TournamentStatusFlags } from "../../util/Constants";
import { TimeUnit } from "../../util/time";
import { Colors } from "../utils/Colors";
import formatDate from "../utils/formatDate";
import { DiscordLogo } from "./DiscordLogo";
import HomeButton from "./HomeButton";
import { ChannelMention } from "./Mentions";

enum TournamentStatus {
	RegistrationOpen,
	Soon,
	RegistrationClosed,
	Running,
	Finished,
	Unknown,
}
const statusText = [
	"Iscrizioni aperte",
	"Soon™",
	"Iscrizioni chiuse",
	"In corso",
	"Terminato",
	"",
];
const statusColor: CSSProperties["color"][] = [
	Colors.Success,
	Colors.Primary,
	Colors.Danger,
	Colors.Primary,
	Colors.Danger,
	"",
];
const gameName = ["Brawl Stars", "Clash Royale"];

export const ListElement = ({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) =>
	children != null &&
	children !== false &&
	children !== "" && (
		<>
			<span style={{ fontWeight: 600 }}>{label}</span>: {children}
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
			t.statusFlags & TournamentStatusFlags.Finished ? TournamentStatus.Finished
			: t.registrationStart && t.registrationStart > now ? TournamentStatus.Soon
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
					<ListElement label="Gioco" children={gameName[t.game]} />
					<ListElement
						label="Dimensione squadra"
						children={`${t.team}v${t.team}`}
					/>
					<ListElement
						label="Modalità"
						children={Array.from(
							new Set(
								(JSON.parse(t.rounds) as Database.Round[]).map((v) => v.mode),
							),
						).join(", ")}
					/>
					<ListElement
						label="Iscrizioni tramite"
						children={bitSetMap(
							t.registrationMode,
							(bit) => bit && "Discord",
							(bit) => bit && "sito",
						).join(", ")}
					/>
					<ListElement
						label="Minimo giocatori"
						children={t.minPlayers?.toLocaleString("it-IT")}
					/>
					<ListElement
						label="Massimo giocatori"
						children={t.maxPlayers?.toLocaleString("it-IT")}
					/>
					<ListElement
						label="Iscrizioni"
						children={
							t.registrationStart &&
							`${formatDate(t.registrationStart)} ― ${formatDate(t.registrationEnd!)}`
						}
					/>
					<ListElement
						label="Creazione brackets"
						children={t.bracketsTime && formatDate(t.bracketsTime)}
					/>
					<ListElement
						label="Inizio torneo"
						children={t.channelsTime && formatDate(t.channelsTime)}
					/>
					<ListElement
						label="Canale iscrizioni"
						children={
							t.registrationChannel && (
								<ChannelMention
									mobile={mobile}
									children={t.registrationChannelName}
									channel={`@me/${t.registrationChannel}${t.registrationMessage ? `/${t.registrationMessage}` : ""}`}
								/>
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
									style={{ backgroundColor: Colors.Primary }}
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
											backgroundColor:
												t.isRegistered ? Colors.Danger : Colors.Success,
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
								style={{
									backgroundColor: Colors.Primary,
									lineHeight: "1.75rem",
								}}
								href={`/tournaments/${t.id}`}
							/>
							<HomeButton
								label="Modifica"
								style={{
									backgroundColor: Colors.Primary,
									lineHeight: "1.75rem",
								}}
								href={`/tournaments/${t.id}/edit`}
							/>
						</div>
					)}
				</div>
			</div>
		);
	});
};
