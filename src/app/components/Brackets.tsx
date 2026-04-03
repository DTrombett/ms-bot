import { useMemo, type CSSProperties } from "react";
import { DBMatchStatus } from "../../util/Constants";
import type { Matches, Participants } from "../tournaments/[id].page";
import useClient from "../utils/useClient";

const style = {
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
} as const satisfies CSSProperties;

const resolveParticipant = (
	participantsMap: Record<string, Participants[number]>,
	id: string,
) => participantsMap[id]?.name ?? "???";

const resolveResult = (
	participantsMap: Record<string, Participants[number]>,
	brackets: (Matches | undefined)[],
	match: Matches[number] | undefined,
	i: number,
	k: number,
	offset: 1 | 2 = 1,
): string => {
	const user = match?.[`user${offset}`];
	if (match) return user ? resolveParticipant(participantsMap, user) : "N/A";
	const parent = brackets[i - 1]?.[k * 2 + offset - 1];

	if (
		!parent ||
		parent.status === DBMatchStatus.ToBePlayed ||
		parent.status === DBMatchStatus.Playing ||
		parent.status === DBMatchStatus.Postponed
	)
		return "TBD";
	if (parent.status === DBMatchStatus.Default)
		return resolveParticipant(participantsMap, parent.user1);
	if (parent.status === DBMatchStatus.Abandoned)
		return (
			parent.result1 == null ?
				parent.result2 == null ?
					"N/A"
				:	resolveParticipant(participantsMap, parent.user2!)
			:	resolveParticipant(participantsMap, parent.user1)
		);
	return [
		{
			u: resolveParticipant(participantsMap, parent.user1),
			r: parent.result1!,
		},
		{
			u: resolveParticipant(participantsMap, parent.user2!),
			r: parent.result2!,
		},
	].sort(({ r: a }, { r: b }) => b - a)[0]!.u;
};

export default useClient(
	"Brackets",
	({
		participants,
		matches,
		embed,
	}: {
		participants: Participants;
		matches: Matches;
		mobile: boolean;
		id: number;
		admin: boolean;
		embed?: boolean;
	}) => {
		const brackets = useMemo(() => {
			const brackets: (Matches | undefined)[] = [];

			for (const match of matches) {
				const level = Math.floor(Math.log2(match.id + 1));

				(brackets[level] ??= [])[match.id - 2 ** level + 1] = match;
			}
			return brackets.reverse();
		}, [matches]);
		const participantsMap = useMemo(
			() => Object.fromEntries(participants.map((p) => [p.userId, p])),
			[participants],
		);

		return (
			<div
				style={{
					display: "flex",
					fontFamily: "LilitaOne",
					fontSize: "0.875rem",
					gap: "4rem",
					lineHeight: "1.25rem",
					margin: "0 auto",
					padding: "0 1rem",
					textAlign: "center",
					whiteSpace: "nowrap",
					width: "fit-content",
				}}>
				{Array.from(brackets, (b, i) => (
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							justifyContent: "space-around",
							height: `calc((6rem + 2.4px) * ${brackets[0]?.length})`,
						}}>
						{Array.from({ length: 2 ** (brackets.length - 1 - i) }, (_, k) => {
							const match = b?.[k];

							return (
								<div
									style={{
										position: "relative",
										border: style.border,
										borderRadius: "4px",
										backgroundColor: style.backgroundColor,
									}}>
									{i > 0 && (
										<>
											<div
												style={{
													border: "0.8px solid rgba(255, 255, 255, 0.2)",
													borderLeft: "none",
													height: `calc((6rem + 2.4px) * ${2 ** (i - 1)} - 0.8px)`,
													left: "calc(-4rem - 0.8px)",
													position: "absolute",
													top: `calc((-3rem - 1.2px) * ${2 ** (i - 1)} + 2rem)`,
													width: "2rem",
												}}
											/>
											<div
												style={{
													borderBottom: "0.8px solid rgba(255, 255, 255, 0.2)",
													height: "2rem",
													left: "calc(-2rem)",
													position: "absolute",
													width: "calc(2rem - 0.8px)",
												}}
											/>
										</>
									)}
									<div
										style={{
											borderBottom: style.border,
											display: "flex",
											alignItems: "center",
											height: "2rem",
										}}>
										<span
											style={{
												paddingBottom: "0.25rem",
												textOverflow: "ellipsis",
												overflowX: "clip",
												width: "8rem",
											}}>
											{resolveResult(participantsMap, brackets, match, i, k)}
										</span>
										<span
											style={{
												width: "2rem",
												borderLeft: style.border,
												height: "1.25rem",
											}}>
											{match && (match.result1 ?? 0)}
										</span>
									</div>
									<span
										style={{
											position: "absolute",
											top: "50%",
											left: "calc(50% - 1rem)",
											transform: "translate(-50%, -50%)",
											fontSize: "1rem",
										}}>
										VS
									</span>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											height: "2rem",
										}}>
										<span
											style={{
												paddingTop: "0.25rem",
												textOverflow: "ellipsis",
												overflowX: "clip",
												width: "8rem",
											}}>
											{resolveResult(participantsMap, brackets, match, i, k, 2)}
										</span>
										<span
											style={{
												width: "2rem",
												borderLeft: style.border,
												height: "1.25rem",
											}}>
											{match && (match.user2 ? (match.result2 ?? 0) : "N")}
										</span>
									</div>
								</div>
							);
						})}
					</div>
				))}
			</div>
		);
	},
);
