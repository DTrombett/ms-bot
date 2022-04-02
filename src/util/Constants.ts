/**
 * Constants about time
 */
export const TIME = {
	/**
	 * The number of milliseconds in a day
	 */
	millisecondsPerDay: 86400000,

	/**
	 * The number of milliseconds in an hour
	 */
	millisecondsPerHour: 3600000,

	/**
	 * The number of milliseconds in a minute
	 */
	millisecondsPerMinute: 60000,

	/**
	 * The number of milliseconds in a second
	 */
	millisecondsPerSecond: 1000,

	/**
	 * The number of seconds in a minute
	 */
	secondsPerMinute: 60,

	/**
	 * The number of seconds in a millisecond
	 */
	secondsPerMillisecond: 1 / 1000,

	/**
	 * The number of minutes in an hour
	 */
	minutesPerHour: 60,

	/**
	 * The number of minutes in a second
	 */
	minutesPerSecond: 1 / 60,

	/**
	 * The number of minutes in a millisecond
	 */
	minutesPerMillisecond: 1 / 60000,

	/**
	 * The number of hours in a day
	 */
	hoursPerDay: 24,

	/**
	 * The number of hours in a second
	 */
	hoursPerSecond: 1 / 24,

	/**
	 * The number of hours in a millisecond
	 */
	hoursPerMillisecond: 1 / 3600000,

	/**
	 * The number of days in a week
	 */
	daysPerWeek: 7,

	/**
	 * The number of days in a month
	 */
	daysPerMonth: 30,

	/**
	 * The number of days in a year
	 */
	daysPerYear: 365,

	/**
	 * The number of days in a decade
	 */
	daysPerDecade: 365 * 10,

	/**
	 * The number of days in a century
	 */
	daysPerCentury: 365 * 100,
} as const;

export const Constants = {
	/**
	 * The label used for the online event of the client
	 */
	clientOnlineLabel: "Client online",

	/**
	 * The name of the folder with commands
	 */
	commandsFolderName: "commands",

	/**
	 * The name of the folder with the database
	 */
	databaseFolderName: "database",

	/**
	 * The name of the folder with events
	 */
	eventsFolderName: "events",

	/**
	 * A regex to match a snowflake
	 */
	snowflakeRegex: /^\d{17,19}$/,
} as const;

export default Constants;
