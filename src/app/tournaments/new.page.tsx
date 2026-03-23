import { Suspense } from "react";
import { Mode, ModeWithSuggestions } from "../components/Mode";
import Rounds from "../components/Rounds";
import {
	CheckboxInput,
	CheckboxListInput,
	DateTimeInput,
	NumberInput,
	RadioInput,
	Section,
	TextInput,
} from "../components/forms";
import { Page } from "../components/layout";
import lilitaOne from "../fonts/LilitaOne-Regular.ttf" with { type: "asset" };
import nougat from "../fonts/Nougat-Regular.ttf" with { type: "asset" };
import ggsans from "../fonts/ggsansvf.woff2" with { type: "asset" };

export enum Game {
	BrawlStars = 1,
	ClashRoyale,
}
export enum Round {
	Manual = 1,
	Once,
	Fast,
}

export default ({
	mobile,
	modesPromise,
	styles,
	url,
}: {
	mobile: boolean;
	modesPromise: Promise<{ name: string }[] | undefined>;
	styles?: string[];
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
		}}
		url={url}>
		<span
			style={{
				fontFamily: "Nougat",
				fontSize: "3rem",
				lineHeight: 1,
				margin: mobile ? "2rem 0" : "1rem 0",
				textAlign: "center",
				userSelect: "none",
			}}>
			NUOVO TORNEO
		</span>
		<form
			method="POST"
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
				/>
				<TextInput
					name="logChannel"
					label="ID canale di log"
					placeholder="L'ID del canale dove inviare i log"
					pattern="\d{16,32}"
					errorMessage="ID non valido"
					required
				/>
				<RadioInput
					label="Videogiuoco"
					name="game"
					options={[
						{
							label: "Brawl Stars",
							value: Game.BrawlStars,
							id: "brawlstars",
							defaultChecked: true,
						},
						{
							label: "Clash Royale",
							value: Game.ClashRoyale,
							id: "clashroyale",
						},
					]}
				/>
				<RadioInput
					label="Dimensione squadra"
					name="team"
					options={[
						{ label: "1v1", value: 1, id: "1v1", defaultChecked: true },
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
							label: "Messaggio con pulsante",
							defaultChecked: true,
						},
						{ id: "dashboard", label: "Dashboard", defaultChecked: true },
						{ id: "command", label: "Comando", defaultChecked: true },
					]}
				/>
				<NumberInput
					label="Minimo partecipanti"
					name="minPlayers"
					placeholder=""
					min={0}
				/>
				<TextInput
					name="messageLink"
					label="Link al messaggio di iscrizione"
					placeholder="Scrivi il messaggio in un canale privato e incolla qui il link per preservare immagini e formattazione"
					pattern="https?://(?:[^.]+\.)?discord\.com/channels/\d{16,32}/\d{16,32}/\d{16,32}"
					errorMessage="Link non valido"
					maxWidth="42rem"
				/>
				<TextInput
					name="channelId"
					label="ID canale iscrizioni"
					placeholder="L'ID del canale dove verrà mandato il messaggio per iscriversi"
					pattern="\d{16,32}"
					errorMessage="ID non valido"
					maxWidth="26.125rem"
				/>
				<TextInput
					name="roleId"
					label="ID ruolo iscritti"
					placeholder="L'ID del ruolo da assegnare agli iscritti"
					pattern="\d{16,32}"
					errorMessage="ID non valido"
					maxWidth="16.125rem"
				/>
				<DateTimeInput name="registrationStartTime" label="Inizio iscrizioni" />
				<DateTimeInput name="registrationEndTime" label="Fine iscrizioni" />
				<CheckboxInput
					label="Richiedi tag giocatore"
					name="tagRequired"
					defaultChecked
				/>
			</Section>
			<Section title="Partite">
				<DateTimeInput
					name="bracketsTime"
					label="Crea brackets automaticamente"
				/>
				<CheckboxInput
					label="Rendi pubbliche le brackets"
					name="publicBrackets"
					defaultChecked
				/>
				<DateTimeInput
					name="autoChannels"
					label="Crea canali automaticamente"
				/>
				<RadioInput
					label="Avanzamento round"
					name="channelsMode"
					options={[
						{
							label: "Manuale",
							value: Round.Manual,
							id: "manual",
							defaultChecked: true,
						},
						{ label: "Automatico", value: Round.Once, id: "once" },
						{
							label: "Crea canali il prima possibile",
							value: Round.Fast,
							id: "fast",
						},
					]}
				/>
				<CheckboxInput
					label="Attiva controllo automatico dei risultati dal registro battaglie"
					name="autoDetectResults"
					defaultChecked
				/>
				<CheckboxInput
					label="Elimina automaticamente i canali al termine del round (finale esclusa)"
					name="autoDeleteChannels"
					defaultChecked
				/>
				<TextInput
					label="Nome canali partite"
					name="channelName"
					placeholder="Il nome da assegnare ai canali delle partite"
					maxWidth="18.25rem"
					note="Puoi usare i placeholder {matchID} {tag1} {id1} {player1} {username1} (stessa cosa per 2 etc.)"
					defaultValue="{matchID}-{player1}-vs-{player2}"
				/>
				<TextInput
					label="Nome canali partite concluse"
					name="endedChannelName"
					placeholder="Il nome da assegnare ai canali delle partite concluse"
					maxWidth="22.25rem"
					note="Puoi usare i placeholder {matchID} {tag1} {id1} {player1} {username1} (stessa cosa per 2 etc.)"
				/>
				<TextInput
					label="ID categoria canali"
					name="categoryId"
					placeholder="L'ID della categoria dove creare i canali"
					pattern="\d{16,32}"
					errorMessage="ID non valido"
					maxWidth="16.625rem"
					note="Impostando una categoria potresti incappare nel limite canali"
				/>
				<TextInput
					label="ID categoria canali partite concluse"
					name="endedCategoryId"
					placeholder="L'ID della categoria dove spostare i canali delle partite concluse"
					pattern="\d{16,32}"
					errorMessage="ID non valido"
					maxWidth="27.25rem"
				/>
				<TextInput
					name="matchMessageLink"
					label="Link al messaggio da mandare nei canali"
					placeholder="Scrivi il messaggio in un canale privato e incolla qui il link per preservare immagini e formattazione"
					pattern="https?://(?:[^.]+\.)?discord\.com/channels/\d{16,32}/\d{16,32}/\d{16,32}"
					errorMessage="Link non valido"
					maxWidth="42rem"
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
				<Suspense fallback={<Mode />}>
					<ModeWithSuggestions usable={modesPromise} required />
				</Suspense>
				<NumberInput
					name="bof"
					id="bof0"
					label="Numero partite"
					placeholder="Best of..."
					step={2}
					defaultValue={1}
					max={25}
					min={1}
					width="7.25rem"
				/>
				<Suspense fallback={<Rounds />}>
					<Rounds modes={modesPromise} />
				</Suspense>
			</Section>
			<input
				className="button"
				type="submit"
				style={{
					backgroundColor: "#008545",
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
				value="Crea torneo"
			/>
		</form>
	</Page>
);
