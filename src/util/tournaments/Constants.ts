import type { CSSProperties } from "react";
import { Colors } from "../../app/utils/Colors";
import { DBMatchStatus } from "../Constants";

export const matchStatus: Record<DBMatchStatus, string> = {
	[DBMatchStatus.Abandoned]: "Vittoria per abbandono",
	[DBMatchStatus.Default]: "Vittoria a tavolino",
	[DBMatchStatus.Finished]: "Terminata",
	[DBMatchStatus.Playing]: "In corso",
	[DBMatchStatus.Postponed]: "Rimandata",
	[DBMatchStatus.ToBePlayed]: "Da giocare",
};
export const roundName = (round: number) =>
	["Finale", "Semifinale", "Quarti di finale", "Ottavi di finale"][round] ??
	`${1 << round}esimi di finale`;
export const statusColors: Record<DBMatchStatus, CSSProperties["color"]> = {
	[DBMatchStatus.Abandoned]: Colors.Danger,
	[DBMatchStatus.Default]: Colors.Success,
	[DBMatchStatus.Finished]: Colors.Success,
	[DBMatchStatus.Playing]: Colors.Primary,
	[DBMatchStatus.Postponed]: Colors.SecondarySolid,
	[DBMatchStatus.ToBePlayed]: Colors.SecondarySolid,
};
