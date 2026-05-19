import {
	useEffect,
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
import { resolveWinner } from "../../util/tournaments/resolveWinner";
import {
	getElementsCount,
	getFirstIndex,
	getLastIndex,
	getLastLevel,
	getLevel,
	getLevelsCount,
} from "../../util/trees";
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
	participant,
}: {
	participant: Participant;
	admin: boolean;
	currentlyPlaying: number;
	match: ResolvedMatch;
	mobile: boolean;
	setActive: Dispatch<SetStateAction<number | null>>;
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
	const dpr = typeof devicePixelRatio === "undefined" ? 1 : devicePixelRatio,
		w =
			(typeof document === "undefined" ? 16 : (
				parseFloat(getComputedStyle(document.documentElement).fontSize)
			)) * 8;

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
				src={`https://cdn.brawlify.com/cdn-cgi/image/f=auto,q=high,onerror=redirect,dpr=${dpr},w=${w}/profile-icons/regular/${
					participant.player ?
						"icon" in participant.player ?
							participant.player.icon.id
						:	"28000000"
					:	"Unknown"
				}.png`}
				onError={(event) =>
					(event.currentTarget.src = `https://cdn.brawlify.com/cdn-cgi/image/f=auto,q=high,onerror=redirect,dpr=${dpr},w=${w}/profile-icons/regular/Unknown.png`)
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
					{participant.name}
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
					name={`result${match.participants.indexOf(participant) + 1}`}
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
							setMatches((m) => m.slice());
							setActive(null);
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
	brackets,
	currentlyPlaying,
	id,
	mobile,
	query,
	setActive,
	setParticipantsMap,
	setMatches,
}: {
	active: number;
	admin: boolean;
	brackets: ResolvedMatch[];
	currentlyPlaying: number;
	id: number;
	mobile: boolean;
	query: URLSearchParams;
	setActive: Dispatch<SetStateAction<number | null>>;
	setParticipantsMap: Dispatch<
		SetStateAction<Record<string, Participants[number]>>
	>;
	setMatches: Dispatch<SetStateAction<Matches>>;
}): ReactNode => {
	const [disabled, setDisabled] = useState(false);
	const [error, setError] = useState<string>();
	const ref = useRef(typeof scrollY === "undefined" ? 0 : scrollY);
	const newQuery = new URLSearchParams(query);
	const match = brackets[active];

	if (!match) {
		setActive(null);
		return <></>;
	}
	useEffect(() => {
		(async () => {
			const params = toSearchParams({
				tag1: match.participants[0].tag,
				tag2: match.participants[1].tag,
				id: match.id,
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
			if (result.player1 || result.player2)
				setParticipantsMap((map) => {
					if (result.player1)
						(map[match.participants[0].userId] ??=
							match.participants[0]).player = result.player1;
					if (result.player2)
						(map[match.participants[1].userId] ??=
							match.participants[1]).player = result.player2;
					return { ...map };
				});
			if (match.original) Object.assign(match.original, result.match);
			else if (result.match)
				setMatches((matches) => matches.concat(result.match!));
		})().catch(console.error);
		return () => scroll({ behavior: "instant", top: ref.current });
	}, []);
	newQuery.delete("match");
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
					match.status !== DBMatchStatus.Finished &&
					match.status !== DBMatchStatus.Abandoned;

				if (
					urlsp.get("result1") === urlsp.get("result2") &&
					!temp &&
					event.nativeEvent.submitter?.id !== "cancel"
				) {
					setError("Non puoi inviare un risultato definitivo pari");
					return setDisabled(false);
				}
				const response = await fetch(
					`/tournaments/${id}/matches/${match.id}?${urlsp.toString()}${match.status === DBMatchStatus.Abandoned || temp ? "" : `&status=${event.nativeEvent.submitter?.id === "cancel" ? DBMatchStatus.Playing : DBMatchStatus.Finished}`}`,
					{ method: "PATCH" },
				);
				if (response.ok) {
					Object.assign(
						match.original!,
						await response.json<Partial<Database.Match>>(),
					);
					setMatches((m) => m.slice());
					setActive(null);
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
				<span style={{ color: statusColors[match.status] }}>
					{matchStatus[match.status]}
				</span>
				<a
					href={`?${newQuery}`}
					type="button"
					onClick={(event) => {
						setActive(null);
						event.preventDefault();
					}}
					style={{
						backgroundColor: "transparent",
						border: "none",
						borderRadius: "100%",
						color: "inherit",
						textDecoration: "none",
						cursor: "pointer",
						fontFamily: "ggsans",
						fontSize: "2.5rem",
						fontWeight: 600,
						height: "2rem",
						lineHeight: "2rem",
						padding: 0,
						userSelect: "none",
						width: "2rem",
					}}>
					×
				</a>
			</div>
			<div style={{ display: "flex", alignItems: "center" }}>
				<MatchParticipant
					participant={match.participants[0]}
					mobile={mobile}
					admin={admin}
					match={match}
					currentlyPlaying={currentlyPlaying}
					setActive={setActive}
					setDisabled={setDisabled}
					setMatches={setMatches}
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
						({match.id})
					</div>
				</div>
				<MatchParticipant
					participant={match.participants[1]}
					mobile={mobile}
					admin={admin}
					match={match}
					currentlyPlaying={currentlyPlaying}
					setActive={setActive}
					setDisabled={setDisabled}
					setMatches={setMatches}
					tournamentId={id}
					setError={setError}
				/>
			</div>
			{admin &&
				match.status !== DBMatchStatus.Default &&
				match.original &&
				match.round <= currentlyPlaying &&
				match.round >= currentlyPlaying - 1 && (
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
									`/tournaments/${id}/matches/${match.id}/abandoned`,
									{
										method:
											match.status === DBMatchStatus.Abandoned ?
												"DELETE"
											:	"POST",
									},
								);

								if (response.ok) {
									Object.assign(
										match.original!,
										await response.json<Partial<Database.Match>>(),
									);
									setMatches((m) => m.slice());
									setActive(null);
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
							{match.status === DBMatchStatus.Abandoned ? "Annulla" : "Segna"}{" "}
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
						{match.status === DBMatchStatus.Finished ?
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
						: match.status === DBMatchStatus.Abandoned ?
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
const BracketsUI = ({
	brackets,
	currentlyPlaying,
	query,
	selectedRound,
	setActive,
	setRound,
}: {
	brackets: ResolvedMatch[];
	currentlyPlaying: number;
	query: URLSearchParams;
	selectedRound: number | null;
	setActive: Dispatch<SetStateAction<number | null>>;
	setRound: Dispatch<SetStateAction<number | null>>;
}): ReactNode => {
	const length =
		selectedRound == null ? getLevelsCount(brackets.length) : selectedRound + 1;

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				margin: "0 auto",
				padding: "0.5rem 1rem",
				textAlign: "center",
				width: "fit-content",
			}}>
			<div
				style={{
					display: "flex",
					flexDirection: "row-reverse",
					justifyContent: "space-between",
				}}>
				{Array.from({ length }, (_, i) => {
					const newQuery = new URLSearchParams(query);

					if (selectedRound === i) newQuery.delete("round");
					else newQuery.set("round", String(i));
					return (
						<a
							href={`?${newQuery}`}
							key={i}
							onClick={(event) => {
								setRound((round) => (round === i ? null : i));
								event.preventDefault();
							}}
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
								textDecoration: "none",
							}}>
							{currentlyPlaying === i && "🔴 "}
							{roundName(i)}
						</a>
					);
				})}
			</div>
			<div
				id="brackets"
				style={{
					display: "flex",
					flexDirection: "row-reverse",
					fontFamily: "LilitaOne",
					fontSize: "0.875rem",
					gap: "3rem",
					lineHeight: "1.25rem",
					whiteSpace: "nowrap",
					height: `calc((5rem + 2.4px) * ${getElementsCount(length - 1)})`,
				}}>
				{Array.from({ length }, (_, i) => (
					<div
						key={i}
						style={{
							display: "flex",
							flexDirection: "column",
							justifyContent: "space-around",
						}}>
						{brackets
							.slice(getFirstIndex(i), getLastIndex(i) + 1)
							.map((match) => {
								const newQuery = new URLSearchParams(query);

								newQuery.set("match", String(match.id));
								return (
									<a
										href={`?${newQuery}`}
										style={{
											position: "relative",
											border: style.border,
											borderRadius: "4px",
											backgroundColor: style.backgroundColor,
											cursor: "pointer",
											color: "inherit",
											textDecoration: "none",
										}}
										className="match"
										key={match.id}
										onClick={(event) => {
											setActive(match.id);
											event.preventDefault();
										}}>
										{i !== length - 1 && (
											<span style={{ pointerEvents: "none" }}>
												<div
													style={{
														border: "0.8px solid rgba(255, 255, 255, 0.2)",
														borderLeft: "none",
														left: "calc(-3rem - 0.8px)",
														position: "absolute",
														width: "1.5rem",
														height: `calc((5rem + 2.4px) * ${2 ** (length - i - 2)} - 0.8px)`,
														top: `calc((-2.5rem - 1.2px) * ${2 ** (length - i - 2)} + 2rem)`,
													}}
												/>
												<div
													style={{
														borderBottom:
															"0.8px solid rgba(255, 255, 255, 0.2)",
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
												{match.participants[0].name}
											</span>
											<span
												style={{
													width: "2rem",
													borderLeft: style.border,
													height: "1.25rem",
												}}>
												{match.participants[0].result}
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
												{match.participants[1].name}
											</span>
											<span
												style={{
													width: "2rem",
													borderLeft: style.border,
													height: "1.25rem",
												}}>
												{match.participants[1].result}
											</span>
										</div>
									</a>
								);
							})}
					</div>
				))}
			</div>
		</div>
	);
};
const parseQueryNumber = (
	query: URLSearchParams,
	name: string,
	{
		min = -Infinity,
		max = Infinity,
		allowNaN,
		aliases = {},
	}: Partial<{
		min: number;
		max: number;
		allowNaN: boolean;
		aliases: Record<string, number>;
	}> = {},
): number | null => {
	let value: string | number | null = query.get(name);

	if (value == null) return null;
	if (value in aliases) return aliases[value]!;
	value = +value;
	if ((!allowNaN && Number.isNaN(value)) || value < min || value > max)
		return null;
	return value;
};

export default useClient(
	"Brackets",
	({
		admin,
		id,
		matches,
		mobile,
		participants,
		query,
		embed,
	}: {
		admin: boolean;
		id: number;
		matches: Matches;
		mobile: boolean;
		participants: Participants;
		query: URLSearchParams;
		embed?: boolean;
	}) => {
		if (typeof location !== "undefined")
			query = new URLSearchParams(location.search);
		const ref = useRef(false);
		const [currentMatches, setMatches] = useState(matches);
		const [participantsMap, setParticipantsMap] = useState(() =>
			Object.fromEntries(participants.map((p) => [p.userId, p])),
		);
		const brackets = useMemo(() => {
			const brackets: ResolvedMatch[] = [];

			for (const match of currentMatches)
				brackets[match.id] = {
					id: match.id,
					original: match,
					round: Math.floor(Math.log2(match.id + 1)),
					status: match.status,
					participants: [
						{ user: match.user1, result: match.result1 },
						{ user: match.user2, result: match.result2 },
					].map<Participant>(({ user, result }) =>
						user == null ?
							{ userId: "", name: "N/A", result: "N" }
						:	{
								name: "???",
								userId: user,
								...participantsMap[user],
								result:
									match.status === DBMatchStatus.Abandoned && result == null ?
										"A"
									:	String(result ?? 0),
							},
					) as [Participant, Participant],
				};
			for (
				let id = 2 ** (Math.floor(Math.log2(brackets.length)) + 1) - 2;
				id >= 0;
				id--
			) {
				if (brackets[id]) continue;
				const tbd = !brackets[Math.floor((id - 1) / 2)];

				brackets[id] = {
					id,
					original: undefined,
					round: Math.floor(Math.log2(id + 1)),
					status: tbd ? DBMatchStatus.ToBePlayed : DBMatchStatus.Default,
					participants: (tbd ?
						[brackets[2 * id + 1], brackets[2 * id + 2]]
					:	[null, null]
					).map<Participant>((match) => {
						const user =
							match?.status === DBMatchStatus.ToBePlayed ?
								undefined
							:	resolveWinner(match?.original);

						return (
							user === undefined ? { userId: "", name: "TBD", result: "-" }
							: user === null ? { userId: "", name: "N/A", result: "N" }
							: {
									name: "",
									userId: user,
									...participantsMap[user],
									result: "-",
								}
						);
					}) as [Participant, Participant],
				};
			}
			return brackets;
		}, [currentMatches, participantsMap]);
		const currentlyPlaying = useMemo(
			() =>
				getLevel(
					brackets.findIndex((p) => p.status !== DBMatchStatus.ToBePlayed),
				),
			[brackets],
		);
		const [active, setActive] = useState(() =>
			parseQueryNumber(query, "match", { min: 0, max: brackets.length - 1 }),
		);
		const [round, setRound] = useState(() =>
			parseQueryNumber(query, "round", {
				min: 0,
				max: getLastLevel(brackets.length),
				aliases: { current: currentlyPlaying },
			}),
		);

		useEffect(() => {
			const listener = () => {
				const query = new URLSearchParams(location.search);

				setActive(parseQueryNumber(query, "match"));
				setRound(parseQueryNumber(query, "round"));
			};

			addEventListener("popstate", listener);
			return () => removeEventListener("popstate", listener);
		}, []);
		useEffect(() => {
			const url = new URL(location.href);

			if (active != null) url.searchParams.set("match", String(active));
			else url.searchParams.delete("match");
			if (round != null) url.searchParams.set("round", String(round));
			else url.searchParams.delete("round");
			if (url.href !== location.href)
				if (ref.current) history.pushState(null, "", url);
				else history.replaceState(null, "", url);
			ref.current = true;
		}, [active, round]);
		return (
			<>
				<div
					style={{
						position: "fixed",
						top: "2.5rem",
						right: active == null ? "0.5rem" : "calc(1rem + 4px)",
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
						onClick={() => location.reload()}
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
				{active == null ?
					<BracketsUI
						query={query}
						brackets={brackets}
						currentlyPlaying={currentlyPlaying}
						selectedRound={round}
						setActive={setActive}
						setRound={setRound}
					/>
				:	<MatchUI
						admin={admin}
						id={id}
						mobile={mobile}
						query={query}
						active={active}
						brackets={brackets}
						currentlyPlaying={currentlyPlaying}
						setActive={setActive}
						setParticipantsMap={setParticipantsMap}
						setMatches={setMatches}
					/>
				}
			</>
		);
	},
);
