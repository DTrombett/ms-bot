import {
	ButtonStyle,
	ComponentType,
	type APIMessageTopLevelComponent,
} from "discord-api-types/v10";
import { MatchStatus } from "./Constants";
import { TimeUnit } from "./time";

export const createLiveComponents = (
	matchdayId: string,
	hash: string,
	nextMatch: number,
): APIMessageTopLevelComponent[] =>
	nextMatch ?
		[
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						custom_id: `predictions-r-${matchdayId.replace(
							"-",
							"%2D",
						)}-${hash}-${Math.max(
							Math.round((nextMatch - Date.now()) / TimeUnit.Second),
							0,
						)}`,
						emoji: { name: "🔁" },
						label: "Aggiorna",
						style: ButtonStyle.Primary,
					},
				],
			},
		]
	:	[];

export const getNextMatch = (matches: Match[]) =>
	matches.some((m) => m.providerStatus === MatchStatus.Live) ?
		Date.now() + TimeUnit.Minute
	: matches.every((m) => m.providerStatus === MatchStatus.Finished) ? 0
	: Math.max(
			Date.now() + TimeUnit.Minute,
			Date.parse(
				matches.find((m) => m.providerStatus === MatchStatus.ToBePlayed)
					?.matchDateUtc ?? "",
			) || Date.now() + TimeUnit.Day,
		);
