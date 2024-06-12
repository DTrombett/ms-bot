import {
	ButtonStyle,
	ComponentType,
	type APIButtonComponent,
} from "discord-api-types/v10";
import type { MatchData } from "./types";

export const createMatchDayComponents = (
	matches: MatchData[],
	locale = "",
	action = "e",
	disabled?: (startTime: number, matchDayId: string) => boolean,
) => {
	const matchDays: Record<string, MatchData[] | undefined> =
		Object.create(null);

	for (const match of matches)
		(matchDays[match.matchday.id] ??= []).push(match);
	const components: [APIButtonComponent[], APIButtonComponent[]] = [[], []];

	// eslint-disable-next-line guard-for-in
	for (const matchDayId in matchDays) {
		const matchDay = matchDays[matchDayId]!;
		const firstMatch = matchDay[0]!;
		const firstRound = firstMatch.round.metaData.type === "GROUP_STANDINGS";

		components[Number(!firstRound)]!.push({
			type: ComponentType.Button,
			custom_id: `predictions-${matchDayId}-${action}`,
			style: firstRound ? ButtonStyle.Primary : ButtonStyle.Success,
			label: `${firstMatch.round.translations?.name?.[locale] ?? firstMatch.round.metaData.name}${firstRound ? ` - ${firstMatch.matchday.translations?.longName?.[locale] ?? firstMatch.matchday.longName}` : ""}`,
			disabled:
				matchDay.some(
					(m) =>
						m.awayTeam.teamTypeDetail === "FAKE" ||
						m.homeTeam.teamTypeDetail === "FAKE",
				) ||
				disabled?.(
					Date.parse(firstMatch.kickOffTime.dateTime) - 15 * 60 * 1000,
					firstMatch.matchday.id,
				),
			emoji: firstRound ? undefined : { name: "🏆" },
		});
	}
	return components.map(
		(c) =>
			({
				type: ComponentType.ActionRow,
				components: c,
			}) as const,
	);
};
