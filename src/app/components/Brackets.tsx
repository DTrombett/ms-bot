import {
	useEffect,
	useMemo,
	useState,
	type CSSProperties,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
} from "react";
import { DBMatchStatus } from "../../util/Constants";
import type { Matches, Participants } from "../tournaments/[id].page";
import { Colors } from "../utils/Colors";
import useClient from "../utils/useClient";
import { ChannelMention } from "./Mentions";
import { ListElement } from "./Tournaments";

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
const status: Record<DBMatchStatus, string> = {
	[DBMatchStatus.Abandoned]: "Vittoria per abbandono",
	[DBMatchStatus.Default]: "Vittoria a tavolino",
	[DBMatchStatus.Finished]: "Terminata",
	[DBMatchStatus.Playing]: "In corso",
	[DBMatchStatus.Postponed]: "Rimandata",
	[DBMatchStatus.ToBePlayed]: "Da giocare",
};
const statusColors: Record<DBMatchStatus, CSSProperties["color"]> = {
	[DBMatchStatus.Abandoned]: Colors.Danger,
	[DBMatchStatus.Default]: Colors.Success,
	[DBMatchStatus.Finished]: Colors.Success,
	[DBMatchStatus.Playing]: Colors.Primary,
	[DBMatchStatus.Postponed]: Colors.SecondarySolid,
	[DBMatchStatus.ToBePlayed]: Colors.SecondarySolid,
};

const resolveParticipant = (
	participantsMap: Record<string, Participants[number]>,
	id: string,
) => participantsMap[id] ?? { name: "???", userId: id };
const resolveMatchParticipant = (
	participantsMap: Record<string, Participants[number]>,
	brackets: (Matches | undefined)[],
	match: Matches[number] | undefined,
	i: number,
	k: number,
	offset: 1 | 2 = 1,
): Participants[number] => {
	const user = match?.[`user${offset}`];
	if (match)
		return user ?
				resolveParticipant(participantsMap, user)
			:	{ name: "N/A", userId: "" };
	const parent = brackets[i - 1]?.[k * 2 + offset - 1];

	if (
		!parent ||
		parent.status === DBMatchStatus.ToBePlayed ||
		parent.status === DBMatchStatus.Playing ||
		parent.status === DBMatchStatus.Postponed
	)
		return { name: "TBD", userId: "" };
	if (parent.status === DBMatchStatus.Default)
		return resolveParticipant(participantsMap, parent.user1);
	if (parent.status === DBMatchStatus.Abandoned)
		return (
			parent.result1 == null ?
				parent.result2 == null ?
					{ name: "N/A", userId: "" }
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

const resolveMatch = (
	brackets: (Matches | undefined)[],
	participantsMap: Record<string, Participants[number]>,
	i: number,
	k: number,
): ResolvedMatch => {
	const match = brackets[i]?.[k];

	return {
		participant1: {
			user: resolveMatchParticipant(participantsMap, brackets, match, i, k),
			result: match ? String(match.result1 ?? 0) : "-",
		},
		participant2: {
			user: resolveMatchParticipant(participantsMap, brackets, match, i, k, 2),
			result:
				match ?
					match.user2 ?
						String(match.result2 ?? 0)
					:	"N"
				:	"-",
		},
		channelId: match?.channelId,
		id: match?.id ?? 2 ** (brackets.length - i - 1) - 1 + k,
		status: match?.status ?? DBMatchStatus.ToBePlayed,
	};
};

const MatchParticipant = (participant: Participant) => (
	<div
		style={{
			display: "flex",
			flexDirection: "column",
			justifyContent: "center",
			alignItems: "center",
			gap: "1rem",
		}}>
		<img
			alt=""
			style={{ height: "8rem", width: "8rem", aspectRatio: 1 }}
			src={`https://cdn.brawlify.com/cdn-cgi/image/f=auto,q=high,dpr=${window.devicePixelRatio},w=${
				parseFloat(getComputedStyle(document.documentElement).fontSize) * 8
			}/profile-icons/regular/${participant.player && "icon" in participant.player ? participant.player.icon.id : "28000000"}.png`}
		/>
		<div>
			<div
				style={{
					fontSize: "1.25rem",
					lineHeight: "1.75rem",
					width: "12.5rem",
					textOverflow: "ellipsis",
					overflowX: "clip",
				}}>
				{participant.user.name}
			</div>
			<div
				style={{
					fontSize: "0.75rem",
					lineHeight: "normal",
					textOverflow: "ellipsis",
					overflowX: "clip",
					fontFamily: "ggsans",
					height: "1rem",
				}}>
				{participant.displayName}
			</div>
			<div
				style={{
					fontSize: "1.25rem",
					lineHeight: "1.75rem",
					width: "12.5rem",
					textOverflow: "ellipsis",
					overflowX: "clip",
				}}>
				{participant.result}
			</div>
		</div>
	</div>
);
const MatchUI = ({
	active,
	setActive,
	mobile,
}: {
	active: ResolvedMatch;
	setActive: Dispatch<SetStateAction<ResolvedMatch | undefined>>;
	mobile: boolean;
}): ReactNode => {
	const effect = async () => {
		const toFetch = [active.participant1.user.tag, active.participant2.user.tag]
			.filter(Boolean)
			.join(",");
		if (!toFetch) return;
		// TODO
		const match = await fetch(`/players/${toFetch}`).then((res) =>
			res.json<ResolvedMatch | null>(),
		);

		if (match) setActive(match);
	};

	useEffect(() => void effect().catch(console.error), []);
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				fontFamily: "LilitaOne",
				fontSize: "1rem",
				gap: "0.75rem",
				lineHeight: "1.25rem",
				margin: "0 auto",
				padding: "0 1rem",
				textAlign: "center",
				whiteSpace: "nowrap",
				width: "fit-content",
			}}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					fontSize: "1.25rem",
					lineHeight: "1.75rem",
					alignItems: "center",
				}}>
				<span style={{ color: statusColors[active.status] }}>
					{status[active.status]}
				</span>
				<button
					type="button"
					onClick={setActive.bind(null, undefined)}
					style={{
						backgroundColor: "transparent",
						border: "none",
						borderRadius: "100%",
						color: "white",
						cursor: "pointer",
						fontFamily: "ggsans",
						fontSize: "2.5rem",
						fontWeight: 600,
						height: "2.5rem",
						lineHeight: 0,
						padding: "0.25rem",
						userSelect: "none",
						width: "2.5rem",
					}}>
					×
				</button>
			</div>
			<div style={{ display: "flex", alignItems: "center" }}>
				<MatchParticipant {...active.participant1} />
				<span style={{ fontSize: "3rem", lineHeight: 1 }}>VS</span>
				<MatchParticipant {...active.participant2} />
			</div>
			<span
				style={{
					fontFamily: "ggsans",
					lineHeight: "normal",
					textAlign: "left",
					margin: "0 auto",
				}}>
				<ListElement label="ID">{String(active.id)}</ListElement>
				<ListElement label="Canale">
					{active.channelId ?
						<ChannelMention channel={`@me/${active.channelId}`} mobile={mobile}>
							{active.channelName ?? "unknown"}
						</ChannelMention>
					:	<i>non creato</i>}
				</ListElement>
			</span>
		</div>
	);
};

export default useClient(
	"Brackets",
	({
		participants,
		matches,
		mobile,
	}: {
		participants: Participants;
		matches: Matches;
		mobile: boolean;
		id: number;
		admin: boolean;
		embed?: boolean;
	}) => {
		const [active, setActive] = useState<ResolvedMatch>();
		const brackets = useMemo(() => {
			const brackets: (Matches | undefined)[] = [];

			for (const match of matches) {
				const level = Math.floor(Math.log2(match.id + 1));

				(brackets[level] ??= [])[match.id - 2 ** level + 1] = match;
			}
			return brackets.reverse();
		}, []);
		const participantsMap = useMemo(
			() => Object.fromEntries(participants.map((p) => [p.userId, p])),
			[],
		);
		const bracketsElement = useMemo(
			() =>
				Array.from(brackets, (_, i) => (
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							justifyContent: "space-around",
							height: `calc((6rem + 2.4px) * ${brackets[0]?.length})`,
						}}>
						{Array.from({ length: 2 ** (brackets.length - 1 - i) }, (_, k) => {
							const match = resolveMatch(brackets, participantsMap, i, k);

							return (
								<div
									style={{
										position: "relative",
										border: style.border,
										borderRadius: "4px",
										backgroundColor: style.backgroundColor,
										cursor: "pointer",
									}}
									onClick={setActive.bind(null, match)}>
									{i > 0 && (
										<span style={{ pointerEvents: "none" }}>
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
										</span>
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
											{match.participant1.user.name}
										</span>
										<span
											style={{
												width: "2rem",
												borderLeft: style.border,
												height: "1.25rem",
											}}>
											{match.participant1.result}
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
											{match.participant2.user.name}
										</span>
										<span
											style={{
												width: "2rem",
												borderLeft: style.border,
												height: "1.25rem",
											}}>
											{match.participant2.result}
										</span>
									</div>
								</div>
							);
						})}
					</div>
				)),
			[],
		);

		return active ?
				<MatchUI active={active} setActive={setActive} mobile={mobile} />
			:	<div
					id="brackets"
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
					{bracketsElement}
				</div>;
	},
);
