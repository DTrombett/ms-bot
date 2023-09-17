import capitalize from "./capitalize";

export const normalizeTeamName = (team: string) =>
	team
		.toLowerCase()
		.split(/\s+/g)
		.map((word) => capitalize(word))
		.join(" ");

export default normalizeTeamName;
