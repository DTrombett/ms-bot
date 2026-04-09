import { env } from "cloudflare:workers";

export const finishRound = async (workflowId: string, round: number) =>
	(await env.TOURNAMENT.get(workflowId)).sendEvent({
		type: `round-${round}`,
		payload: null,
	});
