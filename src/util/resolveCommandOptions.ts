import {
	APIApplicationCommandInteractionDataBasicOption,
	APIApplicationCommandOption,
	APIApplicationCommandSubcommandGroupOption,
	APIApplicationCommandSubcommandOption,
	APIChatInputApplicationCommandInteraction,
	ApplicationCommandOptionType,
	ApplicationCommandType,
} from "discord-api-types/v10";
import { ok } from "node:assert";
import type { CommandData } from "./types";

type ExtractOptionType<T extends APIApplicationCommandOption> = T extends {
	choices: { value: infer V }[];
}
	? V
	: (APIApplicationCommandInteractionDataBasicOption & {
			type: T["type"];
		})["value"];
type CreateObject<
	T extends APIApplicationCommandOption[],
	S extends string | undefined = undefined,
> = T extends (
	| APIApplicationCommandSubcommandGroupOption
	| APIApplicationCommandSubcommandOption
)[]
	? ResolvedOptions<T[number], S>
	: {
			subcommand: S;
			options: {
				[P in T[number] as P["name"]]: P["required"] extends true
					? ExtractOptionType<P>
					: ExtractOptionType<P> | undefined;
			};
		};
type ResolvedOptions<
	T extends
		| APIApplicationCommandSubcommandGroupOption
		| APIApplicationCommandSubcommandOption
		| CommandData,
	S extends string | undefined = undefined,
> =
	T extends CommandData<ApplicationCommandType.ChatInput>
		? CreateObject<NonNullable<T["options"]>>
		: T extends
					| APIApplicationCommandSubcommandGroupOption
					| APIApplicationCommandSubcommandOption
			? CreateObject<
					NonNullable<T["options"]>,
					S extends undefined ? T["name"] : `${S} ${T["name"]}`
				>
			: never;

export const resolveCommandOptions = <T extends CommandData[]>(
	data: T,
	interaction: APIChatInputApplicationCommandInteraction,
) => {
	let templateOptions = data.find(
		(d) =>
			d.type === ApplicationCommandType.ChatInput &&
			d.name === interaction.data.name,
	)!.options!;
	let { options } = interaction.data;
	let subcommand: string | undefined;

	if (options?.[0]?.type === ApplicationCommandOptionType.Subcommand) {
		subcommand = options[0].name;
		[{ options }] = options;
		templateOptions = templateOptions.find(
			(o): o is APIApplicationCommandSubcommandOption =>
				o.type === ApplicationCommandOptionType.Subcommand &&
				o.name === subcommand,
		)!.options!;
	} else if (
		options?.[0]?.type === ApplicationCommandOptionType.SubcommandGroup
	) {
		subcommand = options[0].name;
		[{ options }] = options;
		templateOptions = templateOptions.find(
			(o): o is APIApplicationCommandSubcommandGroupOption =>
				o.type === ApplicationCommandOptionType.SubcommandGroup &&
				o.name === subcommand,
		)!.options!;
		ok(options?.[0]?.type === ApplicationCommandOptionType.Subcommand);
		subcommand += ` ${options[0].name}`;
		let name: string;
		// eslint-disable-next-line prefer-const
		[{ options, name }] = options;
		templateOptions = templateOptions.find(
			(o): o is APIApplicationCommandSubcommandOption =>
				o.type === ApplicationCommandOptionType.Subcommand && o.name === name,
		)!.options!;
	}
	const resolvedOptions: Record<
		string,
		APIApplicationCommandInteractionDataBasicOption["value"]
	> = {};

	for (const option of options ?? []) {
		const tOption = templateOptions.find((o) => o.name === option.name)!;

		ok("value" in option && option.type === tOption.type);
		ok(
			!("choices" in tOption && tOption.choices) ||
				tOption.choices.some((c) => c.value === option.value),
		);
		resolvedOptions[option.name] = option.value;
	}
	return {
		options: resolvedOptions,
		subcommand,
	} as ResolvedOptions<T[number]>;
};
