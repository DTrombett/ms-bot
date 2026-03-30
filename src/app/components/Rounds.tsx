import { Fragment, useState } from "react";
import useClient from "../utils/useClient";
import { NumberInput } from "./forms";
import { Mode } from "./Mode";

export default useClient(
	"Rounds",
	({
		modes,
		rounds,
	}: {
		modes?: { name: string }[];
		rounds?: Database.Round[];
	}) => {
		const [length, setRounds] = useState(rounds?.length ?? 0);

		return (
			<>
				{Array.from({ length }, (_, i) => (
					<Fragment key={i}>
						<h3 style={{ fontWeight: "normal", marginBlock: "0.5em -0.25em" }}>
							Round of {2 ** (i + 2)}
						</h3>
						<Mode
							modes={modes}
							i={i + 1}
							defaultValue={rounds ? rounds[i]?.mode : undefined}
						/>
						<NumberInput
							id={`bof${i + 1}`}
							name={"bof"}
							label="Numero partite"
							placeholder="Best of..."
							step={2}
							defaultValue={rounds ? rounds[i]?.bof : 1}
							max={25}
							min={1}
							width="7.25rem"
						/>
					</Fragment>
				))}
				<div style={{ display: "flex", gap: "1rem" }}>
					<button
						className="button"
						form=""
						type="button"
						onClick={setRounds.bind(null, (rounds) => rounds + 1)}
						style={{
							backgroundColor: "#5865f2",
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
						}}>
						Aggiungi round
					</button>
					{length > 0 && (
						<button
							className="button"
							form=""
							type="button"
							onClick={setRounds.bind(null, (rounds) => rounds - 1)}
							style={{
								backgroundColor: "#D22D39",
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
							}}>
							Rimuovi round
						</button>
					)}
				</div>
			</>
		);
	},
);
