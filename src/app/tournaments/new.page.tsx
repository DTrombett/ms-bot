import type { APIUser } from "discord-api-types/v10";
import type { CSSProperties } from "react";
import {
	CheckboxListInput,
	RadioInput,
	Section,
	TextInput,
} from "../components/forms";
import { Page } from "../components/layout";
import lilitaOne from "../fonts/LilitaOne-Regular.ttf";
import nougat from "../fonts/Nougat-Regular.ttf";
import ggsans from "../fonts/ggsansvf.woff2";

const textInputStyle: CSSProperties = {
	fontFamily: "ggsans",
	fontSize: "1rem",
	lineHeight: "1.5rem",
	backgroundColor: "#22232740",
	borderRadius: "4px",
	marginTop: "0.5rem",
	padding: "0.25rem 0.5rem",
	color: "white",
	fontWeight: 500,
	borderColor: "rgba(255, 255, 255, 0.2)",
	borderStyle: "solid",
	borderWidth: "0.8px",
	width: "stretch",
	maxWidth: "256px",
};
const radioGroupStyle: CSSProperties = {
	fontFamily: "ggsans",
	fontSize: "1rem",
	lineHeight: "1.5rem",
	marginTop: "0.5rem",
	fontWeight: 500,
	display: "flex",
	flexDirection: "column",
	gap: "0.125rem",
};
const radioElementStyle: CSSProperties = {
	display: "flex",
	alignItems: "center",
};
const radioInputStyle: CSSProperties = { margin: "0 0.5rem 0 0.125rem" };

export default ({
	mobile,
	styles,
	url,
	user,
}: {
	mobile: boolean;
	styles: string[];
	url: URL;
	user: Pick<APIUser, "id" | "username" | "avatar" | "global_name">;
}) => (
	<Page
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
				backgroundColor: "rgba(63, 63, 70, 0.25)",
				borderColor: "rgba(255, 255, 255, 0.2)",
				borderRadius: "8px",
				borderStyle: "solid",
				borderWidth: "0.8px",
				display: "flex",
				flexDirection: "column",
				fontFamily: "LilitaOne",
				fontSize: "1.25rem",
				lineHeight: "1.75rem",
				margin: "auto",
				marginBottom: "2rem",
				maxWidth: "stretch",
				padding: mobile ? "0 1.25rem" : "0 2rem",
				width: "64rem",
			}}>
			<Section>
				<TextInput name="title" label="Nome" placeholder="Il nome del torneo" />
				<RadioInput
					label="Videogiuoco"
					name="game"
					options={[
						{ label: "Brawl Stars", value: "brawlStars" },
						{ label: "Clash Royale", value: "clashRoyale" },
					]}
				/>
				<RadioInput
					label="Dimensione squadra"
					name="team"
					options={[
						{ label: "1v1", value: 1, id: "1v1" },
						{ label: "2v2", value: 2, id: "2v2" },
						{ label: "3v3", value: 3, id: "3v3" },
						{ label: "5v5", value: 5, id: "5v5" },
					]}
				/>
				<TextInput
					name="mod"
					label="Modalità"
					placeholder="La modalità del torneo (es. Duels)"
					// TODO: Add autocomplete https://developer.brawlstars.com/api-docs/index.html#/events/getGameModes
				/>
			</Section>
			<Section title="Iscrizioni">
				<CheckboxListInput
					label="Accetta iscrizioni tramite"
					options={[
						{ id: "message", label: "Messaggio con pulsante" },
						{ id: "dashboard", label: "Dashboard" },
						{ id: "command", label: "Comando" },
					]}
				/>
				<TextInput
					name="messageId"
					label="Link al messaggio di iscrizione"
					placeholder="Scrivi il messaggio in un canale privato e incolla qui il link/id per preservare immagini e formattazione"
					maxWidth="690px"
				/>
			</Section>
		</form>
	</Page>
);
