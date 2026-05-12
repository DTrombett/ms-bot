import {
	memo,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
} from "react";
import { DBMatchStatus } from "../../util/Constants";
import { toSearchParams } from "../../util/objects";
import {
	matchStatus,
	roundName,
	statusColors,
} from "../../util/tournaments/Constants";
import type { Matches, Participants } from "../tournaments/[id].page";
import { Colors } from "../utils/Colors";
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
) => participantsMap[id] ?? { name: undefined, userId: id };
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
const updateMatch = (resolved: ResolvedMatch) => {
	if (!resolved.original) return resolved;
	resolved.participant1.result =
		(
			resolved.original.status === DBMatchStatus.Abandoned &&
			resolved.original.result1 == null
		) ?
			"A"
		:	String(resolved.original.result1 ?? 0);
	resolved.participant2.result =
		resolved.original.user2 ?
			(
				resolved.original.status === DBMatchStatus.Abandoned &&
				resolved.original.result2 == null
			) ?
				"A"
			:	String(resolved.original.result2 ?? 0)
		:	"N";
	resolved.id = resolved.original.id;
	resolved.status = resolved.original.status;
	return resolved;
};
const resolveMatch = (
	brackets: (Matches | undefined)[],
	participantsMap: Record<string, Participants[number]>,
	i: number,
	k: number,
): ResolvedMatch => {
	const match = brackets[i]?.[k];
	const participant1 = resolveMatchParticipant(
		participantsMap,
		brackets,
		match,
		i,
		k,
	);
	const participant2 = resolveMatchParticipant(
		participantsMap,
		brackets,
		match,
		i,
		k,
		2,
	);

	return updateMatch({
		participant1: {
			userId: participant1.userId,
			player: {
				name: participant1.name ?? undefined,
				tag: participant1.tag ?? undefined,
			},
			result: "-",
		},
		participant2: {
			userId: participant2.userId,
			player: {
				name: participant2.name ?? undefined,
				tag: participant2.tag ?? undefined,
			},
			result: "-",
		},
		id: 2 ** (brackets.length - i - 1) - 1 + k,
		status: DBMatchStatus.ToBePlayed,
		round: i,
		original: match,
	});
};

const MatchParticipant = ({
	admin,
	currentlyPlaying,
	match,
	mobile,
	setActive,
	setDisabled,
	setError,
	setMatches,
	tournamentId,
	...participant
}: Participant & {
	admin: boolean;
	currentlyPlaying: number;
	match: ResolvedMatch;
	mobile: boolean;
	setActive: Dispatch<SetStateAction<ResolvedMatch | undefined>>;
	setDisabled: Dispatch<SetStateAction<boolean>>;
	setError: Dispatch<SetStateAction<string | undefined>>;
	setMatches: Dispatch<SetStateAction<Matches>>;
	tournamentId: number;
}) => {
	const canEdit =
		admin &&
		participant.userId !== "" &&
		match.status !== DBMatchStatus.Default &&
		match.original &&
		match.round <= currentlyPlaying &&
		match.round >= currentlyPlaying - 1;

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				justifyContent: "flex-start",
				alignItems: "center",
				gap: "0.5rem",
				height: "stretch",
			}}>
			<img
				alt=""
				style={{ height: "8rem", width: "8rem", aspectRatio: 1 }}
				src={`https://cdn.brawlify.com/cdn-cgi/image/f=auto,q=high,onerror=redirect,dpr=${window.devicePixelRatio},w=${parseFloat(getComputedStyle(document.documentElement).fontSize) * 8}/profile-icons/regular/${
					participant.player?.tag ?
						"icon" in participant.player ?
							participant.player.icon.id
						:	"28000000"
					:	"Unknown"
				}.png`}
				onError={(event) =>
					(event.currentTarget.src = `https://cdn.brawlify.com/cdn-cgi/image/f=auto,q=high,onerror=redirect,dpr=${window.devicePixelRatio},w=${parseFloat(getComputedStyle(document.documentElement).fontSize) * 8}/profile-icons/regular/Unknown.png`)
				}
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
					{participant.player?.name ?? "???"}
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
					{participant.userId}
				</div>
			</div>
			{canEdit && !Number.isNaN(Number(participant.result)) ?
				<input
					type="number"
					name={`result${+(participant.userId === match.participant2.userId) + 1}`}
					defaultValue={participant.result}
					min={0}
					max={100}
					style={{
						backgroundColor: "transparent",
						borderColor: "rgba(255, 255, 255, 0.2)",
						borderRadius: "4px",
						borderStyle: "solid",
						borderWidth: "0.8px",
						color: "white",
						fontFamily: "ggsans",
						fontSize: "1.25rem",
						fontWeight: 500,
						lineHeight: "1.5rem",
						padding: "0.25rem",
						paddingLeft: mobile ? undefined : "1.25rem",
						textAlign: "center",
						textOverflow: "ellipsis",
						width: "calc(6.5rem - 4.8px)",
					}}
					required={true}
				/>
			:	<div
					style={{
						fontSize: "1.25rem",
						lineHeight: "1.75rem",
						overflowX: "clip",
						textOverflow: "ellipsis",
					}}>
					{participant.result}
				</div>
			}
			{canEdit && (
				<button
					className="deleteButton"
					form=""
					type="button"
					onClick={async () => {
						setDisabled(true);
						const response = await fetch(
							`/tournaments/${tournamentId}/matches/${match.id}/abandoned?user=${participant.userId}`,
							{ method: participant.result === "A" ? "DELETE" : "POST" },
						);

						if (response.ok) {
							Object.assign(
								match.original!,
								await response.json<Partial<Database.Match>>(),
							);
							console.log(match.original);
							setMatches((m) => m.slice());
							setActive(undefined);
						} else {
							setError(
								(
									await response
										.json<{ message: string } | null>()
										.catch(() => null)
								)?.message ?? "Si è verificato un errore sconosciuto",
							);
							setDisabled(false);
						}
					}}
					style={{
						backgroundColor: "transparent",
						border: "none",
						borderRadius: "0.5rem",
						color: "white",
						cursor: "pointer",
						fontFamily: "ggsans",
						fontSize: "1rem",
						fontWeight: 500,
						lineHeight: "normal",
						margin: "0 auto",
						padding: "0.5rem 0.75rem",
						userSelect: "none",
						width: "fit-content",
					}}>
					{participant.result === "A" ? "Annulla" : "Segna"} abbandono
				</button>
			)}
		</div>
	);
};
const MatchUI = ({
	active,
	admin,
	currentlyPlaying,
	id,
	mobile,
	setActive,
	setMatches,
}: {
	active: ResolvedMatch;
	admin: boolean;
	currentlyPlaying: number;
	id: number;
	mobile: boolean;
	setActive: Dispatch<SetStateAction<ResolvedMatch | undefined>>;
	setMatches: Dispatch<SetStateAction<Matches>>;
}): ReactNode => {
	const [disabled, setDisabled] = useState(false);
	const [error, setError] = useState<string>();
	const scrollPosition = useRef(window.scrollY);

	useLayoutEffect(() => {
		document.body.style.overflowY = "clip";
	}, []);
	useEffect(() => {
		(async () => {
			const params = toSearchParams({
				tag1: active.participant1.player?.tag,
				tag2: active.participant2.player?.tag,
				id: active.original?.id,
			}).toString();
			if (!params) return;
			const result = await fetch(`/tournaments/${id}/matchData?${params}`).then(
				(res) =>
					res.json<
						| Partial<{
								player1: Brawl.Player | Clash.Player;
								player2: Brawl.Player | Clash.Player;
								match: Database.Match;
						  }>
						| { message: string }
					>(),
			);

			if ("message" in result) return console.error(result.message);
			if (active.original) Object.assign(active.original, result.match);
			else active.original = result.match;
			setActive(
				(active) =>
					active &&
					updateMatch({
						...active,
						participant1: {
							...active.participant1,
							player: result.player1 ?? active.participant1.player,
						},
						participant2: {
							...active.participant2,
							player: result.player2 ?? active.participant2.player,
						},
					}),
			);
		})().catch(console.error);
		return () => {
			document.body.style.overflowY = "";
			window.scrollTo({ top: scrollPosition.current, behavior: "instant" });
		};
	}, []);
	return (
		<form
			id="match"
			style={{
				display: "flex",
				flexDirection: "column",
				fontFamily: "LilitaOne",
				fontSize: "1rem",
				gap: "0.5rem",
				lineHeight: "1.25rem",
				margin: "50vh auto 0",
				padding: "0 1rem",
				textAlign: "center",
				transform: "translateY(-50%)",
				whiteSpace: "nowrap",
				width: "fit-content",
			}}
			onSubmit={async (event) => {
				setDisabled(true);
				event.preventDefault();
				const urlsp = new URLSearchParams(
					Array.from(new FormData(event.currentTarget).entries(), ([k, v]) => [
						k,
						typeof v === "string" ? v : v.name,
					]),
				);
				const temp =
					event.nativeEvent.submitter?.id === "temp" &&
					active.status !== DBMatchStatus.Finished &&
					active.status !== DBMatchStatus.Abandoned;

				if (
					urlsp.get("result1") === urlsp.get("result2") &&
					!temp &&
					event.nativeEvent.submitter?.id !== "cancel"
				) {
					setError("Non puoi inviare un risultato definitivo pari");
					return setDisabled(false);
				}
				const response = await fetch(
					`/tournaments/${id}/matches/${active.id}?${urlsp.toString()}${active.status === DBMatchStatus.Abandoned || temp ? "" : `&status=${event.nativeEvent.submitter?.id === "cancel" ? DBMatchStatus.Playing : DBMatchStatus.Finished}`}`,
					{ method: "PATCH" },
				);
				if (response.ok) {
					Object.assign(
						active.original!,
						await response.json<Partial<Database.Match>>(),
					);
					setMatches((m) => m.slice());
					setActive(undefined);
				} else {
					setError(
						(
							await response
								.json<{ message: string } | null>()
								.catch(() => null)
						)?.message ?? "Si è verificato un errore sconosciuto",
					);
					setDisabled(false);
				}
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
					{matchStatus[active.status]}
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
						height: "2rem",
						lineHeight: 0,
						padding: 0,
						userSelect: "none",
						width: "2rem",
					}}>
					×
				</button>
			</div>
			<div style={{ display: "flex", alignItems: "center" }}>
				<MatchParticipant
					{...active.participant1}
					mobile={mobile}
					admin={admin}
					match={active}
					currentlyPlaying={currentlyPlaying}
					setMatches={setMatches}
					setDisabled={setDisabled}
					setActive={setActive}
					tournamentId={id}
					setError={setError}
				/>
				<div>
					<div style={{ fontSize: "3rem", lineHeight: 1 }}>VS</div>
					<div
						style={{
							fontSize: "0.75rem",
							lineHeight: 1,
							fontFamily: "ggsans",
						}}>
						({active.id})
					</div>
				</div>
				<MatchParticipant
					{...active.participant2}
					mobile={mobile}
					admin={admin}
					match={active}
					currentlyPlaying={currentlyPlaying}
					setMatches={setMatches}
					setDisabled={setDisabled}
					setActive={setActive}
					tournamentId={id}
					setError={setError}
				/>
			</div>
			{admin &&
				active.status !== DBMatchStatus.Default &&
				active.original &&
				active.round <= currentlyPlaying &&
				active.round >= currentlyPlaying - 1 && (
					<div
						style={{
							display: "flex",
							fontFamily: "ggsans",
							fontSize: "1.125rem",
							fontWeight: 500,
							gap: "0.75rem",
							opacity: disabled ? 0.5 : undefined,
							userSelect: "none",
							justifyContent: "center",
							marginTop: "0.25rem",
						}}>
						<button
							className="button"
							form=""
							type="button"
							disabled={disabled}
							onClick={async () => {
								setDisabled(true);
								const response = await fetch(
									`/tournaments/${id}/matches/${active.id}/abandoned`,
									{
										method:
											active.status === DBMatchStatus.Abandoned ?
												"DELETE"
											:	"POST",
									},
								);

								if (response.ok) {
									Object.assign(
										active.original!,
										await response.json<Partial<Database.Match>>(),
									);
									setMatches((m) => m.slice());
									setActive(undefined);
								} else {
									setError(
										(
											await response
												.json<{ message: string } | null>()
												.catch(() => null)
										)?.message ?? "Si è verificato un errore sconosciuto",
									);
									setDisabled(false);
								}
							}}
							style={{
								backgroundColor: Colors.Danger,
								border: "none",
								borderRadius: "0.5rem",
								color: "white",
								cursor: disabled ? "not-allowed" : "pointer",
								padding: "0.5rem 0.75rem",
								fontFamily: "ggsans",
								fontSize: "1.125rem",
								fontWeight: 500,
							}}>
							{active.status === DBMatchStatus.Abandoned ? "Annulla" : "Segna"}{" "}
							abbandono
						</button>
						<input
							value="Invia risultati"
							className="button"
							type="submit"
							disabled={disabled}
							style={{
								backgroundColor: Colors.Success,
								border: "none",
								borderRadius: "0.5rem",
								color: "white",
								cursor: disabled ? "not-allowed" : "pointer",
								padding: "0.5rem 0.75rem",
								fontFamily: "ggsans",
								fontSize: "1.125rem",
								fontWeight: 500,
							}}
						/>
						{active.status === DBMatchStatus.Finished ?
							<input
								value="Segna come non finita"
								className="button"
								type="submit"
								id="cancel"
								disabled={disabled}
								style={{
									backgroundColor: Colors.Danger,
									border: "none",
									borderRadius: "0.5rem",
									color: "white",
									cursor: disabled ? "not-allowed" : "pointer",
									padding: "0.5rem 0.75rem",
									fontFamily: "ggsans",
									fontSize: "1.125rem",
									fontWeight: 500,
								}}
							/>
						: active.status === DBMatchStatus.Abandoned ?
							<></>
						:	<input
								value="Invia provvisorio"
								className="button"
								type="submit"
								id="temp"
								disabled={disabled}
								style={{
									backgroundColor: Colors.Primary,
									border: "none",
									borderRadius: "0.5rem",
									color: "white",
									cursor: disabled ? "not-allowed" : "pointer",
									padding: "0.5rem 0.75rem",
									fontFamily: "ggsans",
									fontSize: "1.125rem",
									fontWeight: 500,
								}}
							/>
						}
					</div>
				)}
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
		</form>
	);
};
const BracketsUI = memo(
	({
		brackets,
		currentlyPlaying,
		participantsMap,
		setActive,
		setRound,
	}: {
		brackets: (Matches | undefined)[];
		currentlyPlaying: number;
		participantsMap: Record<string, Participants[number]>;
		setActive: Dispatch<SetStateAction<ResolvedMatch | undefined>>;
		setRound: Dispatch<SetStateAction<number | undefined>>;
	}): ReactNode => (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				margin: "0 auto",
				padding: "0.5rem 1rem",
				textAlign: "center",
				width: "fit-content",
			}}>
			<div style={{ display: "flex", justifyContent: "space-between" }}>
				{Array.from(brackets, (_, i) => (
					<button
						key={brackets.length - i}
						onClick={setRound.bind(null, (round) =>
							round === brackets.length - i - 1 ?
								undefined
							:	brackets.length - i - 1,
						)}
						className="deleteButton"
						style={{
							width: "calc(2.4px + 10rem)",
							padding: "0.5rem",
							fontFamily: "ggsans",
							fontSize: "1rem",
							lineHeight: "2rem",
							color: "white",
							cursor: "pointer",
							backgroundColor: "transparent",
							paddingBlock: 0,
							paddingInline: 0,
							border: "none",
							borderRadius: "4px",
						}}>
						{currentlyPlaying === i && "🔴 "}
						{roundName(brackets.length - i - 1)}
					</button>
				))}
			</div>
			<div
				id="brackets"
				style={{
					display: "flex",
					fontFamily: "LilitaOne",
					fontSize: "0.875rem",
					gap: "3rem",
					lineHeight: "1.25rem",
					whiteSpace: "nowrap",
					height: `calc((5rem + 2.4px) * ${brackets[0]?.length ?? 0})`,
				}}>
				{Array.from(brackets, (_, i) => (
					<div
						key={brackets.length - i}
						style={{
							display: "flex",
							flexDirection: "column",
							justifyContent: "space-around",
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
									key={match.id}
									onClick={setActive.bind(null, match)}>
									{i > 0 && (
										<span style={{ pointerEvents: "none" }}>
											<div
												style={{
													border: "0.8px solid rgba(255, 255, 255, 0.2)",
													borderLeft: "none",
													height: `calc((5rem + 2.4px) * ${2 ** (i - 1)} - 0.8px)`,
													left: "calc(-3rem - 0.8px)",
													position: "absolute",
													top: `calc((-2.5rem - 1.2px) * ${2 ** (i - 1)} + 2rem)`,
													width: "1.5rem",
												}}
											/>
											<div
												style={{
													borderBottom: "0.8px solid rgba(255, 255, 255, 0.2)",
													height: "2rem",
													left: "calc(-1.5rem)",
													position: "absolute",
													width: "calc(1.5rem - 0.8px)",
												}}
											/>
										</span>
									)}
									<div
										style={{
											top: "50%",
											position: "absolute",
											transform: `translate(${match.id ? "+" : "-"}50%, -50%)`,
											pointerEvents: "none",
											fontSize: "0.75rem",
											fontFamily: "ggsans",
											...(match.id ?
												{ right: "calc(-0.75rem - 0.8px)" }
											:	{ left: "calc(-0.75rem - 0.8px)" }),
										}}>
										{match.id}
									</div>
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
											{match.participant1.player?.name ?? "???"}
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
											{match.participant2.player?.name ?? "???"}
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
				))}
			</div>
		</div>
	),
);

export default useClient(
	"Brackets",
	({
		participants,
		matches,
		mobile,
		id,
		admin,
		embed,
	}: {
		participants: Participants;
		matches: Matches;
		mobile: boolean;
		id: number;
		admin: boolean;
		embed?: boolean;
	}) => {
		const [active, setActive] = useState<ResolvedMatch>();
		const [currentMatches, setMatches] = useState(matches);
		const [round, setRound] = useState<number>();
		const [currentParticipants] = useState(participants);
		const brackets = useMemo(() => {
			const brackets: (Matches | undefined)[] = [];

			for (const match of currentMatches) {
				const level = Math.floor(Math.log2(match.id + 1));

				if (round == null || level <= round)
					(brackets[level] ??= [])[match.id - 2 ** level + 1] = match;
			}
			return brackets.reverse();
		}, [currentMatches, round]);
		const participantsMap = useMemo(
			() => Object.fromEntries(currentParticipants.map((p) => [p.userId, p])),
			[currentParticipants],
		);
		const currentlyPlaying = useMemo(
			() =>
				Math.max(
					brackets.findLastIndex((b) =>
						b?.some((p) => p.status !== DBMatchStatus.ToBePlayed),
					),
					0,
				),
			[brackets],
		);

		return (
			<>
				<div
					style={{
						position: "fixed",
						top: "2.5rem",
						right: active ? "calc(1rem + 4px)" : "0.5rem",
						padding: "0 0.5rem",
						display: "flex",
						gap: "0.25rem",
						zIndex: 10,
						transition: "none",
					}}>
					{!embed && (
						<button
							className="deleteButton"
							type="button"
							onClick={() =>
								document.fullscreenElement ?
									document.exitFullscreen()
								:	document.documentElement.requestFullscreen()
							}
							style={{
								backgroundColor: "transparent",
								border: "none",
								borderRadius: "0.5rem",
								color: "white",
								cursor: "pointer",
								fontFamily: "ggsans",
								fontSize: "2.5rem",
								fontWeight: 600,
								height: "2.5rem",
								lineHeight: 0,
								marginRight: 0,
								padding: "0.25rem",
								userSelect: "none",
								width: "2.5rem",
							}}>
							↕
						</button>
					)}
					<button
						className="deleteButton"
						type="button"
						onClick={
							typeof window === "undefined" ? undefined : (
								window.location.reload.bind(window.location)
							)
						}
						style={{
							backgroundColor: "transparent",
							border: "none",
							borderRadius: "0.5rem",
							color: "white",
							cursor: "pointer",
							fontFamily: "ggsans",
							fontSize: "2.5rem",
							fontWeight: 600,
							height: "2.5rem",
							lineHeight: 0,
							marginRight: 0,
							padding: "0.25rem",
							userSelect: "none",
							width: "2.5rem",
						}}>
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">
							<path
								fill="currentColor"
								d="M22.242 22.242l2.829 2.829c-3.905 3.905-10.237 3.904-14.143-.001-2.247-2.246-3.194-5.296-2.854-8.225l-4.037.367c-.215 3.84 1.128 7.752 4.062 10.687 5.467 5.467 14.333 5.468 19.799 0l2.828 2.828.849-9.334-9.333.849zM27.899 8.1C22.431 2.633 13.568 2.633 8.1 8.1L5.272 5.272l-.849 9.334 9.334-.849-2.829-2.829c3.906-3.905 10.236-3.905 14.142 0 2.248 2.247 3.194 5.297 2.856 8.226l4.036-.366c.216-3.841-1.128-7.753-4.063-10.688z"
							/>
						</svg>
					</button>
				</div>
				{active ?
					<MatchUI
						active={active}
						setActive={setActive}
						mobile={mobile}
						id={id}
						admin={admin}
						currentlyPlaying={currentlyPlaying}
						setMatches={setMatches}
					/>
				:	<BracketsUI
						brackets={brackets}
						currentlyPlaying={currentlyPlaying}
						participantsMap={participantsMap}
						setActive={setActive}
						setRound={setRound}
					/>
				}
			</>
		);
	},
);
