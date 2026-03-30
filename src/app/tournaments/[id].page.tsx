import Participants from "../components/Participants";
import { Page } from "../components/layout";
import lilitaOne from "../fonts/LilitaOne-Regular.ttf" with { type: "asset" };
import nougat from "../fonts/Nougat-Regular.ttf" with { type: "asset" };
import ggsans from "../fonts/ggsansvf.woff2" with { type: "asset" };

export default ({
	admin,
	mobile,
	styles,
	tournament,
	url,
}: {
	admin: boolean;
	mobile: boolean;
	styles?: string[];
	tournament: Database.Tournament & {
		participants: (Pick<Database.Participant, "userId" | "tag" | "team"> &
			Pick<Database.SupercellPlayer, "name">)[];
	};
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
				padding: `1rem 1.25rem`,
				width: "32rem",
			}}>
			<Participants
				mobile={mobile}
				participants={tournament.participants}
				id={tournament.id}
			/>
			{/* <div
        style={{
            fontFamily: "ggsans",
            fontSize: "1rem",
            lineHeight: "normal",
        }}>
        <ListElement label="Gioco" value={gameName[t.game]} />
        <ListElement label="Dimensione squadra" value={`${t.team}v${t.team}`} />
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
                                fillRule="evenodd"
                                d="M10.99 3.16A1 1 0 1 0 9 2.84L8.15 8H4a1 1 0 0 0 0 2h3.82l-.67 4H3a1 1 0 1 0 0 2h3.82l-.8 4.84a1 1 0 0 0 1.97.32L8.85 16h4.97l-.8 4.84a1 1 0 0 0 1.97.32l.86-5.16H20a1 1 0 1 0 0-2h-3.82l.67-4H21a1 1 0 1 0 0-2h-3.82l.8-4.84a1 1 0 1 0-1.97-.32L15.15 8h-4.97l.8-4.84ZM14.15 14l.67-4H9.85l-.67 4h4.97Z"
                                clipRule="evenodd"
                            />
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
                    style={{ backgroundColor: Colors.Primary, lineHeight: "1.75rem" }}
                    href={`/tournaments/${t.id}`}
                />
                <HomeButton
                    label="Modifica"
                    style={{ backgroundColor: Colors.Primary, lineHeight: "1.75rem" }}
                    href={`/tournaments/${t.id}/edit`}
                />
            </div>
        )}
    </div> */}
		</div>
	</Page>
);
