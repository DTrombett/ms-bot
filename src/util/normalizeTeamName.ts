import capitalize from "./capitalize";

export const normalizeTeamName = (team: string) =>
	team
		.toLowerCase()
		.split(/\s+/g)
		.map((word) => capitalize(word))
		.join(" ");

export const createMatchName = (match: Match) =>
	[match.home.officialName, match.away.officialName]
		.map(normalizeTeamName)
		.join(" - ");

export default normalizeTeamName;
