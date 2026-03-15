import {
	CheckboxInput,
	CheckboxListInput,
	DateTimeInput,
	RadioInput,
	Section,
	TextInput,
} from "../components/forms";
import { Page } from "../components/layout";
import lilitaOne from "../fonts/LilitaOne-Regular.ttf";
import nougat from "../fonts/Nougat-Regular.ttf";
import ggsans from "../fonts/ggsansvf.woff2";

export default ({
	mobile,
	styles,
	url,
}: {
	mobile: boolean;
	styles: string[];
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
				padding: mobile ? "0 	d" : "0 2rem",
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
					required
				/>
				<RadioInput
					label="Videogiuoco"
					name="game"
					options={[
						{ label: "Brawl Stars", value: "brawlStars", defaultChecked: true },
						{ label: "Clash Royale", value: "clashRoyale" },
					]}
				/>
				<RadioInput
					label="Dimensione squadra"
					name="team"
					options={[
						{ label: "1v1", value: 1, id: "1v1", defaultChecked: true },
						{ label: "2v2", value: 2, id: "2v2" },
						{ label: "3v3", value: 3, id: "3v3" },
						{ label: "5v5", value: 5, id: "5v5" },
					]}
				/>
				<TextInput
					name="mod"
					label="Modalità"
					placeholder="La modalità del torneo (es. Duels)"
					required
					// TODO: Add autocomplete https://developer.brawlstars.com/api-docs/index.html#/events/getGameModes
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
				<TextInput
					name="messageId"
					label="Link al messaggio di iscrizione"
					placeholder="Scrivi il messaggio in un canale privato e incolla qui il link/id per preservare immagini e formattazione"
					maxWidth="43.125rem"
				/>
				<TextInput
					name="channelId"
					label="ID canale iscrizioni"
					placeholder="L'ID del canale dove verrà mandato il messaggio per iscriversi"
					maxWidth="26.125rem"
				/>
				<TextInput
					name="roleId"
					label="ID ruolo iscritti"
					placeholder="L'ID del ruolo da assegnare agli iscritti"
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
						{ label: "Manuale", value: "manual" },
						{
							label: "Automatico a fine round",
							value: "once",
							defaultChecked: true,
						},
						{ label: "Crea canali il prima possibile", value: "fast" },
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
				/>
				<TextInput
					label="ID categoria canali"
					name="categoryId"
					placeholder="L'ID della categoria dove creare i canali"
					maxWidth="16.625rem"
					note="Impostando una categoria potresti incappare nel limite canali"
				/>
				<TextInput
					name="matchMessageId"
					label="Link al messaggio da mandare nei canali"
					placeholder="Scrivi il messaggio in un canale privato e incolla qui il link/id per preservare immagini e formattazione"
					maxWidth="43.125rem"
				/>
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
