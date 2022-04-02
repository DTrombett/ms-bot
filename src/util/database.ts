import { createReadStream, createWriteStream } from "node:fs";
import Constants from "./Constants";
import type { DatabaseVariables } from "./types";

export const database: Partial<DatabaseVariables> = {};

/**
 * Import a variable from the database.
 * @param name - The name of the variable to get
 * @param force - Whether to skip the cache and force a re-read
 * @returns The value of the variable
 */
export const importVariable = async <T extends keyof DatabaseVariables>(
	name: T,
	force = false
): Promise<DatabaseVariables[T]> => {
	if (database[name] !== undefined && !force) return database[name]!;
	let data = "";

	return new Promise((resolve, reject) => {
		createReadStream(`./${Constants.databaseFolderName}/${name}.json`)
			.on("data", (chunk) => (data += chunk))
			.once("end", () => {
				try {
					resolve((database[name] = JSON.parse(data)));
				} catch (error) {
					reject(error);
				}
			})
			.once("error", reject)
			.setEncoding("utf8");
	});
};

/**
 * Write a variable to the database.
 * @param name - The name of the variable to write
 * @param value - The value of the variable
 */
export const writeVariable = async <T extends keyof DatabaseVariables>(
	name: T,
	value: DatabaseVariables[T]
): Promise<void> => {
	database[name] = value;
	return new Promise((resolve, reject) => {
		createWriteStream(`./${Constants.databaseFolderName}/${name}.json`)
			.once("error", reject)
			.setDefaultEncoding("utf8")
			.end(JSON.stringify(value), resolve);
	});
};
