import { useState, type Dispatch, type SetStateAction } from "react";
import { Colors } from "../utils/Colors";
import useClient from "../utils/useClient";

const DeleteButton = ({
	p,
	mobile,
	id,
	i,
	setP,
}: {
	p: Pick<Database.Participant, "userId"> &
		Pick<Database.SupercellPlayer, "name">;
	mobile: boolean;
	id: number;
	i: number;
	setP: Dispatch<
		SetStateAction<
			(Pick<Database.Participant, "userId" | "tag" | "team"> &
				Pick<Database.SupercellPlayer, "name">)[]
		>
	>;
}) => {
	const [active, setActive] = useState(false);

	return (
		<button
			disabled={active}
			className="button"
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
				backgroundColor: Colors.Danger,
				border: "none",
				borderRadius: mobile ? "100%" : "0.5rem",
				color: "white",
				cursor: active ? "not-allowed" : "pointer",
				fontFamily: "ggsans",
				fontSize: mobile ? "2.5rem" : "1rem",
				fontWeight: 600,
				height: mobile ? "2.5rem" : undefined,
				lineHeight: mobile ? 0 : "1.5rem",
				marginRight: "0.5rem",
				opacity: active ? 0.5 : undefined,
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

		return (
			<>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						marginBottom: "0.5rem",
					}}>
					<span>Iscritti</span>
					<span style={{ color: Colors.Success }}>{p.length}</span>
				</div>
				<ol
					style={{
						height: "16rem",
						overflowY: "auto",
						fontSize: "1.125rem",
						lineHeight: "1.75rem",
						margin: mobile ? "0 0.25rem" : "0 0.75rem",
						listStyleType: "none",
						paddingInlineStart: 0,
					}}>
					{p.map((p, i) => (
						<li
							key={p.userId}
							style={{
								display: "flex",
								marginBlockEnd: "0.5rem",
								alignItems: "center",
							}}>
							<div style={{ flex: 1 }}>
								<span>{p.name}</span>
								<div style={{ fontSize: "0.875rem", lineHeight: "1.25rem" }}>
									{p.tag}
								</div>
							</div>
							<DeleteButton i={i} id={id} mobile={mobile} p={p} setP={setP} />
						</li>
					))}
				</ol>
			</>
		);
	},
);
