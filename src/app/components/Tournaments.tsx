import { env } from "cloudflare:workers";
import React, { use, type CSSProperties } from "react";
import { bitSetMap } from "../../util/bitSets";
import { TimeUnit } from "../../util/time";

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

export default ({
	tournaments,
	mobile,
}: {
	tournaments: Promise<Database.Tournament[]>;
	mobile: boolean;
}) => {
	const now = Date.now() / TimeUnit.Second;

	return use(tournaments).map((t) => {
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
					margin: "1.5rem auto",
					maxWidth: "stretch",
					padding: "1rem",
					width: "64rem",
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
								(JSON.parse(t.rounds) as { mode: string; bof: number }[]).map(
									(v) => v.mode,
								),
							),
						).join(", ")}
					/>
					<ListElement
						label="Iscrizioni tramite"
						value={bitSetMap(
							t.registrationMode,
							(bit) => bit && "Discord",
							(bit) => bit && "dashboard",
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
									href={`${mobile ? "https://discord.com" : "discord://"}/channels/${env.MAIN_GUILD}/${t.registrationChannel}${t.registrationMessage ? `/${t.registrationMessage}` : ""}`}
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
									<span style={{ whiteSpace: "nowrap" }}>
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
									</span>
									<span>{t.registrationChannelName}</span>
								</a>
							)
						}
					/>
				</div>
			</div>
		);
	});
};
