import {
	APIInteractionResponse,
	InteractionType,
	type APIInteraction,
} from "discord-api-types/v10";
import type { CommandOptions, Env, ExecutorContext } from "./types";

export const executeInteraction = async <I extends APIInteraction>(
	interaction: I,
	env: Env,
	context: ExecutionContext,
	type: NonNullable<
		{
			[K in keyof CommandOptions]?: CommandOptions[K] extends
				| ((arg1: any, arg2: ExecutorContext<I>) => any)
				| undefined
				? K
				: never;
		}[keyof CommandOptions]
	>,
	command?: CommandOptions,
) => {
	const { user } = interaction.member ?? interaction;
	const executor = command?.[type];

	if (!executor || (command.isPrivate && !env.OWNER_ID.includes(user!.id)))
		return undefined;
	console.log(
		`${InteractionType[interaction.type]} interaction received in channel ${interaction.channel?.name ?? interaction.channel?.id} from user ${interaction.member?.nick ?? user?.username} (${user?.id})`,
	);
	return new Promise<APIInteractionResponse>((resolve, reject) => {
		let done = false;
		const promise = executor(
			(value) => {
				if (done) return;
				resolve(value);
				done = true;
			},
			{ env, context, interaction: interaction as never },
		)?.catch((err: Error) => {
			if (done) console.error(err);
			else reject(err);
		});

		if (promise) context.waitUntil(promise);
	});
};
