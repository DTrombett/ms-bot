import { Suspense } from "react";
import { Temporal } from "temporal-polyfill";
import {
	RegistrationMode,
	SupercellPlayerType,
	TournamentFlags,
	TournamentRoundMode,
} from "../../util/Constants";
import { Colors } from "../utils/Colors";
import { Mode, ModeWithSuggestions } from "./Mode";
import Rounds from "./Rounds";
import {
	CheckboxInput,
	CheckboxListInput,
	DateTimeInput,
	NumberInput,
	RadioInput,
	Section,
	TextInput,
} from "./forms";

export default ({
	mobile,
	modesPromise,
	tournament,
}: {
	mobile: boolean;
	modesPromise: Promise<{ name: string }[] | undefined>;
	tournament?: Database.Tournament;
}) => {
	const rounds: Database.Round[] | undefined =
		tournament?.rounds ? JSON.parse(tournament?.rounds) : undefined;

	return (
		<form
			method={"POST"}
			action={
				tournament ? `/tournaments/${tournament.id}/edit` : "/tournaments"
			}
			style={{
				backgroundColor: mobile ? undefined : "rgba(63, 63, 70, 0.25)",
				border: mobile ? undefined : "0.8px solid rgba(255, 255, 255, 0.2)",
				borderRadius: "8px",
				display: "flex",
				flexDirection: "column",
				fontFamily: "LilitaOne",
				fontSize: "1.25rem",
				lineHeight: "1.75rem",
				margin: "auto",
				marginBottom: "2rem",
				maxWidth: "stretch",
				padding: mobile ? "0 1rem" : "0 2rem",
				paddingBlockEnd: "1em",
				width: "64rem",
			}}>
			<Section>
				<TextInput
					name="title"
					label="Nome"
					placeholder="Il nome del torneo"
					required
					defaultValue={tournament?.name}
				/>
				<TextInput
					name="logChannel"
					label="ID canale di log"
					placeholder="L'ID del canale dove inviare i log"
					pattern="\d{16,32}"
					errorMessage="ID non valido"
					required
					defaultValue={tournament?.logChannel}
				/>
				<RadioInput
					label="Videogiuoco"
					name="game"
					default={
						tournament ? tournament.game : SupercellPlayerType.BrawlStars
					}
					options={[
						{
							label: "Brawl Stars",
							value: SupercellPlayerType.BrawlStars,
							id: "brawlstars",
						},
						{
							label: "Clash Royale",
							value: SupercellPlayerType.ClashRoyale,
							id: "clashroyale",
						},
					]}
				/>
				<RadioInput
					label="Dimensione squadra"
					name="team"
					default={tournament ? tournament.team : 1}
					options={[
						{ label: "1v1", value: 1, id: "1v1" },
						{ label: "2v2", value: 2, id: "2v2" },
						{ label: "3v3", value: 3, id: "3v3" },
						{ label: "4v4", value: 4, id: "4v4" },
						{ label: "5v5", value: 5, id: "5v5" },
					]}
				/>
			</Section>
			<Section title="Iscrizioni">
				<CheckboxListInput
					label="Accetta iscrizioni tramite"
					options={[
						{
							id: "message",
							label: "Discord",
							defaultChecked:
								tournament ?
									(tournament.registrationMode & RegistrationMode.Discord) !== 0
								:	true,
						},
						{
							id: "dashboard",
							label: "Dashboard",
							defaultChecked:
								tournament ?
									(tournament.registrationMode & RegistrationMode.Dashboard) !==
									0
								:	true,
						},
					]}
				/>
				<NumberInput
					label="Minimo partecipanti"
					name="minPlayers"
					placeholder=""
					min={0}
					defaultValue={tournament?.minPlayers ?? undefined}
				/>
				<NumberInput
					label="Massimo partecipanti"
					name="maxPlayers"
					placeholder=""
					min={0}
					defaultValue={tournament?.maxPlayers ?? undefined}
				/>
				<TextInput
					name="messageLink"
					label="Link al messaggio di iscrizione"
					placeholder="Scrivi il messaggio in un canale privato e incolla qui il link per preservare immagini e formattazione"
					pattern="https?://(?:[^.]+\.)?discord\.com/channels/(?:\d{16,32}|@me)/\d{16,32}/\d{16,32}"
					errorMessage="Link non valido"
					maxWidth="42rem"
					defaultValue={
						tournament?.registrationTemplateLink ?
							`https://discord.com/channels/@me/${tournament.registrationTemplateLink}`
						:	undefined
					}
				/>
				<TextInput
					name="channelId"
					label="ID canale iscrizioni"
					placeholder="L'ID del canale dove verrà mandato il messaggio per iscriversi"
					pattern="\d{16,32}"
					errorMessage="ID non valido"
					maxWidth="26.125rem"
					defaultValue={tournament?.registrationChannel ?? undefined}
				/>
				<TextInput
					name="roleId"
					label="ID ruolo iscritti"
					placeholder="L'ID del ruolo da assegnare agli iscritti"
					pattern="\d{16,32}"
					errorMessage="ID non valido"
					maxWidth="16.125rem"
					defaultValue={tournament?.registrationRole ?? undefined}
				/>
				<DateTimeInput
					name="registrationStartTime"
					label="Inizio iscrizioni"
					defaultValue={
						tournament?.registrationStart ?
							Temporal.Instant.fromEpochMilliseconds(
								tournament.registrationStart * 1000,
							)
								.toZonedDateTimeISO("Europe/Rome")
								.toString({
									smallestUnit: "minute",
									timeZoneName: "never",
									offset: "never",
								})
						:	undefined
					}
				/>
				<DateTimeInput
					name="registrationEndTime"
					label="Fine iscrizioni"
					defaultValue={
						tournament?.registrationEnd ?
							Temporal.Instant.fromEpochMilliseconds(
								tournament.registrationEnd * 1000,
							)
								.toZonedDateTimeISO("Europe/Rome")
								.toString({
									smallestUnit: "minute",
									timeZoneName: "never",
									offset: "never",
								})
						:	undefined
					}
				/>
				<CheckboxInput
					label="Richiedi tag giocatore"
					name="tagRequired"
					defaultChecked={
						tournament ?
							(tournament.flags & TournamentFlags.TagRequired) !== 0
						:	true
					}
				/>
			</Section>
			<Section title="Partite">
				<DateTimeInput
					name="bracketsTime"
					label="Crea brackets automaticamente"
					defaultValue={
						tournament?.bracketsTime ?
							Temporal.Instant.fromEpochMilliseconds(
								tournament.bracketsTime * 1000,
							)
								.toZonedDateTimeISO("Europe/Rome")
								.toString({
									smallestUnit: "minute",
									timeZoneName: "never",
									offset: "never",
								})
						:	undefined
					}
				/>
				<CheckboxInput
					label="Rendi pubbliche le brackets"
					name="publicBrackets"
					defaultChecked={
						tournament ?
							(tournament.flags & TournamentFlags.PublicBrackets) !== 0
						:	true
					}
				/>
				<DateTimeInput
					name="autoChannels"
					label="Crea thread automaticamente"
					defaultValue={
						tournament?.channelsTime ?
							Temporal.Instant.fromEpochMilliseconds(
								tournament.channelsTime * 1000,
							)
								.toZonedDateTimeISO("Europe/Rome")
								.toString({
									smallestUnit: "minute",
									timeZoneName: "never",
									offset: "never",
								})
						:	undefined
					}
				/>
				<RadioInput
					label="Avanzamento round"
					name="channelsMode"
					default={tournament?.roundType ?? TournamentRoundMode.Manual}
					options={[
						{
							label: "Manuale",
							value: TournamentRoundMode.Manual,
							id: "manual",
						},
						{
							label: "Automatico",
							value: TournamentRoundMode.Once,
							id: "once",
						},
						{
							label: "Crea scontri il prima possibile",
							value: TournamentRoundMode.Fast,
							id: "fast",
						},
					]}
				/>
				<CheckboxInput
					label="Attiva controllo automatico dei risultati dal registro battaglie"
					name="autoDetectResults"
					defaultChecked={
						tournament ?
							(tournament.flags & TournamentFlags.AutoDetectResults) !== 0
						:	true
					}
				/>
				<CheckboxInput
					label="Chiudi automaticamente i thread al termine della partita"
					name="autoArchive"
					defaultChecked={
						tournament ?
							(tournament.flags & TournamentFlags.AutoArchive) !== 0
						:	true
					}
				/>
				<CheckboxInput
					label="Chiudi e blocca automaticamente i thread al termine del round"
					name="autoLock"
					defaultChecked={
						tournament ?
							(tournament.flags & TournamentFlags.AutoLock) !== 0
						:	true
					}
				/>
				<CheckboxInput
					label="Elimina i thread al termine del torneo (finale esclusa)"
					name="autoDeleteChannels"
					defaultChecked={
						tournament ?
							(tournament.flags & TournamentFlags.AutoLock) !== 0
						:	false
					}
				/>
				<TextInput
					label="Nome thread scontri"
					name="channelName"
					placeholder="Il nome da assegnare ai thread delle partite"
					maxWidth="18.25rem"
					note="Puoi usare i placeholder {matchId} {tag1} {id1} {player1} {username1} (stessa cosa per 2 etc.)"
					defaultValue={
						tournament ?
							(tournament.channelName ?? undefined)
						:	"{matchId}: {player1} VS {player2}"
					}
				/>
				<TextInput
					label="Nome thread scontri terminati"
					name="endedChannelName"
					placeholder="Il nome da assegnare ai thread delle partite terminate"
					maxWidth="22.25rem"
					note="Puoi usare i placeholder {matchId} {tag1} {id1} {player1} {username1} (stessa cosa per 2 etc.)"
					defaultValue={
						tournament ?
							(tournament.endedChannelName ?? undefined)
						:	"!{matchId}: {player1} VS {player2}"
					}
				/>
				<TextInput
					label="ID canale torneo"
					name="categoryId"
					placeholder="L'ID del canale dove creare i thread"
					pattern="\d{16,32}"
					errorMessage="ID non valido"
					defaultValue={tournament?.categoryId ?? undefined}
				/>
				<TextInput
					name="matchMessageLink"
					label="Link al messaggio da mandare nei thread"
					placeholder="Scrivi il messaggio in un canale privato e incolla qui il link per preservare immagini e formattazione"
					pattern="https?://(?:[^.]+\.)?discord\.com/channels/(?:\d{16,32}|@me)/\d{16,32}/\d{16,32}"
					errorMessage="Link non valido"
					maxWidth="42rem"
					defaultValue={
						tournament?.matchMessageLink ?
							`https://discord.com/channels/@me/${tournament.matchMessageLink}`
						:	undefined
					}
				/>
			</Section>
			<Section title="Impostazioni round">
				<span
					style={{
						color: "yellow",
						display: "block",
						fontFamily: "ggsans",
						fontSize: "1rem",
						lineHeight: "normal",
					}}>
					Gli altri round useranno le impostazioni dell'ultimo specificato
				</span>
				<h3 style={{ fontWeight: "normal", marginBlock: "0.5em -0.25em" }}>
					Finale
				</h3>
				<Suspense
					fallback={
						<Mode defaultValue={rounds ? rounds[0]?.mode : undefined} />
					}>
					<ModeWithSuggestions
						usable={modesPromise}
						required
						defaultValue={rounds ? rounds[0]?.mode : undefined}
					/>
				</Suspense>
				<NumberInput
					name="bof"
					id="bof0"
					label="Numero partite"
					placeholder="Best of..."
					step={2}
					defaultValue={rounds ? rounds[0]?.bof : 1}
					max={25}
					min={1}
					width="7.25rem"
				/>
				<Suspense fallback={<Rounds rounds={rounds?.slice(1)} />}>
					<Rounds modes={modesPromise} rounds={rounds?.slice(1)} />
				</Suspense>
			</Section>
			<input
				className="button"
				type="submit"
				style={{
					backgroundColor: Colors.Success,
					borderRadius: "0.5rem",
					fontFamily: "ggsans",
					fontSize: "1.125rem",
					fontWeight: 600,
					lineHeight: "1.75rem",
					padding: "0.5rem 1rem",
					textAlign: "center",
					userSelect: "none",
					cursor: "pointer",
					color: "white",
					width: "fit-content",
					border: "none",
					margin: "auto",
					marginBlockStart: "1em",
				}}
				value={tournament ? "Modifica torneo" : "Crea torneo"}
			/>
		</form>
	);
};
