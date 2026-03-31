import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Colors } from "../utils/Colors";
import useClient from "../utils/useClient";
import { styles } from "./forms";

const DeleteButton = ({
	disabled,
	i,
	id,
	mobile,
	p,
	setP,
}: {
	disabled: boolean;
	i: number;
	id: number;
	mobile: boolean;
	p: Pick<Database.Participant, "userId"> &
		Pick<Database.SupercellPlayer, "name">;
	setP: Dispatch<
		SetStateAction<
			(Pick<Database.Participant, "userId" | "tag" | "team"> &
				Pick<Database.SupercellPlayer, "name">)[]
		>
	>;
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
					!confirm(`Vuoi davvero rimuovere l'iscrizione di ${p.name}?`)
				)
					return;
				setActive(true);
				await fetch(`/tournaments/${id}/participants/${p.userId}`, {
					method: "DELETE",
				});
				setP((p) => p.toSpliced(i, 1));
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

export default useClient(
	"Participants",
	({
		participants,
		mobile,
		id,
	}: {
		participants: (Pick<Database.Participant, "userId" | "tag" | "team"> &
			Pick<Database.SupercellPlayer, "name">)[];
		mobile: boolean;
		id: number;
	}) => {
		const [p, setP] = useState(participants);
		const [selection, setSelection] = useState(0);
		const [disabled, setDisabled] = useState(false);
		const form = useRef<HTMLFormElement>(null);
		const timeout = useRef<number>(null);

		return (
			<form
				ref={form}
				action={async (formData) => {
					if (
						!confirm(
							`Vuoi davvero rimuovere l'iscrizione di ${selection} utenti?`,
						)
					)
						return;
					const value = Array.from(formData.keys());

					setDisabled(true);
					await fetch(`/tournaments/${id}/participants/deleteBatch`, {
						method: "POST",
						body: JSON.stringify(value),
					});
					setP(p.filter((v) => !value.includes(v.userId)));
					setSelection(0);
					setDisabled(false);
				}}
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
					padding: "1rem 1.25rem 1rem 1rem",
					width: "32rem",
				}}>
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
										setSelection(event.target.checked ? p.length : 0);
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
							<span style={{ color: Colors.Success }}>{p.length}</span>
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
					{p.map((p, i) => (
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
								aria-label={p.name}
								onChange={(event) =>
									setSelection(
										(s) => s + Math.sign(+event.target.checked - 0.5),
									)
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

									event.preventDefault();
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
								<span>{p.name}</span>
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
								setP={setP}
							/>
						</li>
					))}
				</ol>
			</form>
		);
	},
);
