import type { CSSProperties } from "react";
import { bitSetMap } from "../../util/bitSets";
import { TimeUnit } from "../../util/time";
import useClient from "../utils/useClient";

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
	value: string | undefined;
}) =>
	value && (
		<>
			<span style={{ fontWeight: 600 }}>{label}</span>: {value}
		</>
	);

export default useClient(
	"Tournaments",
	({ tournaments }: { tournaments: Database.Tournament[] }) => {
		const now = Date.now() / TimeUnit.Second;

		return tournaments.map((t) => {
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
						<br />
						<ListElement
							label="Dimensione squadra"
							value={`${t.team}v${t.team}`}
						/>
						<br />
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
						<br />
						<ListElement
							label="Iscrizioni tramite"
							value={bitSetMap(
								t.registrationMode,
								(bit) => bit && "Discord",
								(bit) => bit && "dashboard",
							).join(", ")}
						/>
						<br />
						<ListElement
							label="Minimo giocatori"
							value={t.minPlayers?.toLocaleString("it-IT")}
						/>
					</div>
				</div>
			);
		});
	},
);
