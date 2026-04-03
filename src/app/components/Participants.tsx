import {
	useRef,
	useState,
	type CSSProperties,
	type Dispatch,
	type SetStateAction,
} from "react";
import type { Participants } from "../tournaments/[id].page";
import { Colors } from "../utils/Colors";
import useClient from "../utils/useClient";
import { Section, styles, TextInput } from "./forms";

enum UI {
	List,
	AddParticipant,
}

const style: CSSProperties = {
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
	padding: "1rem 1.25rem 1rem 1rem",
	width: "32rem",
	height: "24rem",
};

const DeleteButton = ({
	disabled,
	i,
	id,
	mobile,
	p,
	setP,
	setError,
}: {
	disabled: boolean;
	i: number;
	id: number;
	mobile: boolean;
	p: Participants[number];
	setP: Dispatch<SetStateAction<Participants>>;
	setError: Dispatch<SetStateAction<string | undefined>>;
}) => {
	const [active, setActive] = useState(false);

	disabled ||= active;
	return (
		<button
			className="deleteButton"
			form=""
			type="button"
			disabled={disabled}
			onClick={async (event) => {
				if (
					!event.shiftKey &&
					!confirm(
						`Vuoi davvero rimuovere l'iscrizione di ${p.name ?? p.tag ?? p.userId}?`,
					)
				)
					return;
				setActive(true);
				const response = await fetch(
					`/tournaments/${id}/participants/${p.userId}`,
					{ method: "DELETE" },
				);

				if (response.ok)
					setP((p) => {
						const copy = p.slice();

						copy.splice(i, 1);
						return copy;
					});
				else
					setError(
						(
							await response
								.json<{ message: string } | null>()
								.catch(() => null)
						)?.message ?? "Si è verificato un errore sconosciuto",
					);
				setActive(false);
			}}
			style={{
				backgroundColor: "transparent",
				border: "none",
				borderRadius: mobile ? "100%" : "0.5rem",
				color: "white",
				cursor: disabled ? "not-allowed" : "pointer",
				fontFamily: "ggsans",
				fontSize: mobile ? "2.5rem" : "0.875rem",
				fontWeight: 600,
				height: mobile ? "2.5rem" : undefined,
				lineHeight: mobile ? 0 : "1.25rem",
				marginRight: mobile ? 0 : "0.5rem",
				opacity: disabled ? 0.5 : undefined,
				padding: mobile ? "0.25rem" : "0.5rem",
				userSelect: "none",
				width: mobile ? "2.5rem" : undefined,
			}}>
			{mobile ? "×" : "Rimuovi"}
		</button>
	);
};

const ListUI = ({
	participants,
	mobile,
	id,
	setUI,
	setParticipants,
}: {
	participants: Participants;
	mobile: boolean;
	id: number;
	setUI: Dispatch<SetStateAction<UI>>;
	setParticipants: Dispatch<SetStateAction<Participants>>;
}) => {
	const [selection, setSelection] = useState(0);
	const [disabled, setDisabled] = useState(false);
	const [error, setError] = useState<string>();
	const form = useRef<HTMLFormElement>(null);
	const timeout = useRef<number>(null);

	return (
		<form
			ref={form}
			onSubmit={async (event) => {
				event.preventDefault();
				if (
					!confirm(
						`Vuoi davvero rimuovere l'iscrizione di ${selection} utenti?`,
					)
				)
					return;
				setDisabled(true);
				const value = Array.from(new FormData(event.currentTarget).keys());
				const response = await fetch(
					`/tournaments/${id}/participants/deleteBatch`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(value),
					},
				);

				if (response.ok) {
					setParticipants((prev) =>
						prev.filter((v) => !value.includes(v.userId)),
					);
					setSelection(0);
				} else
					setError(
						(
							await response
								.json<{ message: string } | null>()
								.catch(() => null)
						)?.message ?? "Si è verificato un errore sconosciuto",
					);
				setDisabled(false);
			}}
			style={style}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					marginBottom: "0.5rem",
					height: "2.25rem",
				}}>
				{selection ?
					<>
						<div>
							<input
								type="checkbox"
								style={{ ...styles.checkbox, opacity: "75%" }}
								form=""
								id="allParticipants"
								onChange={(event) => {
									form.current
										?.querySelectorAll<HTMLInputElement>(
											'input[type="checkbox"]',
										)
										.forEach((el) => (el.checked = event.target.checked));
									setSelection(event.target.checked ? participants.length : 0);
								}}
							/>
							<span style={{ marginLeft: "0.5rem" }}>
								{selection} selezionati
							</span>
						</div>
						<input
							type="submit"
							className="button"
							value={mobile ? "×" : "Rimuovi"}
							disabled={disabled}
							style={{
								backgroundColor: Colors.Danger,
								border: "none",
								borderRadius: mobile ? "100%" : "0.5rem",
								color: "white",
								cursor: disabled ? "not-allowed" : "pointer",
								fontFamily: "ggsans",
								fontSize: mobile ? "2.5rem" : "0.875rem",
								fontWeight: 600,
								height: mobile ? "2.5rem" : undefined,
								lineHeight: mobile ? 0 : "1.25rem",
								marginRight: mobile ? 0 : "0.5rem",
								padding: mobile ? "0.25rem" : "0.5rem",
								userSelect: "none",
								opacity: disabled ? 0.5 : undefined,
								width: mobile ? "2.5rem" : undefined,
							}}
						/>
					</>
				:	<>
						<span style={{ marginLeft: "0.25rem" }}>Iscritti</span>
						<span style={{ color: Colors.Success }}>{participants.length}</span>
					</>
				}
			</div>
			<ol
				style={{
					height: "16rem",
					overflowY: "auto",
					fontSize: "1.25rem",
					lineHeight: "1.5rem",
					margin: 0,
					listStyleType: "none",
					paddingInlineStart: 0,
				}}>
				{participants.map((p, i) => (
					<li
						className={mobile ? "activeBg" : undefined}
						key={p.userId}
						style={{
							display: "flex",
							marginBlockEnd: "0.5rem",
							alignItems: "center",
							borderRadius: "0.25rem",
						}}>
						<input
							type="checkbox"
							style={{
								...styles.checkbox,
								opacity: "75%",
								display: !mobile || selection > 0 ? undefined : "none",
							}}
							name={p.userId}
							aria-label={p.name ?? p.tag ?? p.userId}
							onChange={(event) =>
								setSelection((s) => s + Math.sign(+event.target.checked - 0.5))
							}
						/>
						<div
							style={{
								flex: 1,
								marginLeft: mobile && !selection ? "1rem" : "0.5rem",
								transitionProperty: "none",
								userSelect: "none",
							}}
							onTouchStart={(event) => {
								const input = event.currentTarget.parentElement
									?.firstElementChild as HTMLInputElement | undefined;

								if (input && !input.checked)
									timeout.current = window.setTimeout(() => {
										if (!input.checked) {
											input.checked = true;
											setSelection((s) => s + 1);
										}
									}, 700);
							}}
							onClick={(event) => {
								const input = event.currentTarget.parentElement
									?.firstElementChild as HTMLInputElement | undefined;

								if (input?.checked) {
									event.preventDefault();
									input.checked = false;
									setSelection((s) => s - 1);
								}
							}}
							onTouchEnd={() => clearTimeout(timeout.current)}
							onTouchCancel={() => clearTimeout(timeout.current)}>
							<span>{p.name ?? p.tag ?? p.userId}</span>
							<div style={{ fontSize: "0.75rem", lineHeight: "1rem" }}>
								{p.tag}
							</div>
						</div>
						<DeleteButton
							i={i}
							id={id}
							mobile={mobile}
							p={p}
							disabled={disabled}
							setError={setError}
							setP={setParticipants}
						/>
					</li>
				))}
			</ol>
			{error && (
				<span
					style={{
						color: Colors.Danger,
						fontFamily: "ggsans",
						fontSize: "1rem",
						fontWeight: "normal",
						lineHeight: "1.5rem",
						textAlign: "center",
					}}>
					{error}
				</span>
			)}
			<button
				className="button"
				form=""
				type="button"
				onClick={setUI.bind(null, UI.AddParticipant)}
				style={{
					backgroundColor: Colors.Primary,
					borderRadius: "0.5rem",
					fontFamily: "ggsans",
					fontSize: "1.125rem",
					fontWeight: 600,
					lineHeight: "1.75rem",
					padding: "0.5rem 1rem",
					userSelect: "none",
					cursor: "pointer",
					color: "white",
					border: "none",
					width: "fit-content",
					margin: "auto auto 0",
				}}>
				Aggiungi partecipante
			</button>
		</form>
	);
};

const AddParticipantUI = ({
	id,
	setUI,
	setParticipants,
}: {
	id: number;
	setUI: Dispatch<SetStateAction<UI>>;
	setParticipants: Dispatch<SetStateAction<Participants>>;
}) => {
	const [disabled, setDisabled] = useState(false);
	const [error, setError] = useState<string>();

	return (
		<form
			onSubmit={async (event) => {
				setDisabled(true);
				event.preventDefault();
				const response = await fetch(`/tournaments/${id}/participants`, {
					method: "POST",
					body: new FormData(event.currentTarget),
				});

				if (response.ok) {
					const result = await response.json<{
						userId: string;
						tournamentId: number;
						tag: string | null;
						name: string | null | undefined;
					}>();

					setParticipants((p) => p.concat(result));
					setUI(UI.List);
				} else {
					setDisabled(false);
					setError(
						(
							await response
								.json<{ message: string } | null>()
								.catch(() => null)
						)?.message ?? "Si è verificato un errore sconosciuto",
					);
				}
			}}
			style={style}>
			<Section
				style={{
					marginBottom: "0.5rem",
					fontSize: "1rem",
					lineHeight: "2rem",
					marginLeft: "0.25rem",
				}}
				title="Aggiungi partecipante">
				<TextInput
					name="userId"
					label="ID utente"
					placeholder="L'ID dell'utente da registrare"
					pattern="\d{16,32}"
					errorMessage="ID non valido"
					required
					style={{ marginBlockStart: 0 }}
				/>
				<TextInput
					label="Tag giocatore"
					name="tag"
					placeholder="Il tag giocatore da collegare"
				/>
			</Section>
			{error && (
				<span
					style={{
						color: Colors.Danger,
						fontFamily: "ggsans",
						fontSize: "1rem",
						fontWeight: "normal",
						lineHeight: "1.5rem",
						textAlign: "center",
					}}>
					{error}
				</span>
			)}
			<div style={{ display: "flex", gap: "1rem", margin: "auto auto 0" }}>
				<input
					value="Registra"
					className="button"
					type="submit"
					disabled={disabled}
					style={{
						backgroundColor: Colors.Success,
						borderRadius: "0.5rem",
						fontFamily: "ggsans",
						fontSize: "1.125rem",
						fontWeight: 600,
						lineHeight: "1.75rem",
						padding: "0.5rem 1rem",
						userSelect: "none",
						cursor: disabled ? "not-allowed" : "pointer",
						color: "white",
						opacity: disabled ? 0.5 : undefined,
						border: "none",
					}}
				/>
				<button
					className="button"
					form=""
					type="button"
					onClick={setUI.bind(null, UI.List)}
					disabled={disabled}
					style={{
						backgroundColor: Colors.Danger,
						borderRadius: "0.5rem",
						fontFamily: "ggsans",
						fontSize: "1.125rem",
						fontWeight: 600,
						lineHeight: "1.75rem",
						padding: "0.5rem 1rem",
						userSelect: "none",
						cursor: disabled ? "not-allowed" : "pointer",
						color: "white",
						opacity: disabled ? 0.5 : undefined,
						border: "none",
					}}>
					Annulla
				</button>
			</div>
		</form>
	);
};

export default useClient(
	"Participants",
	({
		participants,
		mobile,
		id,
	}: {
		participants: Participants;
		mobile: boolean;
		id: number;
	}) => {
		const [ui, setUI] = useState<UI>(UI.List);
		const [p, setP] = useState(participants);

		return ui === UI.List ?
				<ListUI
					id={id}
					mobile={mobile}
					participants={p}
					setUI={setUI}
					setParticipants={setP}
				/>
			:	<AddParticipantUI id={id} setUI={setUI} setParticipants={setP} />;
	},
);
