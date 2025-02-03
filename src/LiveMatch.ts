import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	Routes,
	type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { ok } from "node:assert";
import { rest, type CommentaryResponse, type Env } from "./util";

export type Params = { slug: string };

export class LiveMatch extends WorkflowEntrypoint<Env, Params> {
	titles: Record<string, string> = {
		goal: "GOL!",
		"penalty goal": "GOL!",
		"own goal": "GOL!",
		"yellow card": "CARTELLINO GIALLO",
		"second_yellow red card": "DOPPIA AMMONIZIONE",
		"penalty save": "RIGORE SBAGLIATO",
		"team news": "NOTIZIE DELLA SQUADRA",
		"red card": "CARTELLINO ROSSO",
		"kick off": "CALCIO INIZIO",
		penalty: "RIGORE!",
		substitution: "SOSTITUZIONE",
		highlight: "AZIONE PERICOLOSA",
		"half_time summary": "RIEPILOGO PRIMO TEMPO",
		"post_match summary": "RIEPILOGO FINE PARTITA",
		stats: "PILLOLA STATISTICA",
	};
	colors: Record<string, number> = {
		goal: 0x2115ee,
		"penalty goal": 0x2115ee,
		"own goal": 0x2115ee,
		"yellow card": 0xfce41c,
		"second_yellow red card": 0xfce31c,
		"red card": 0xfc043c,
		"kick off": 0x04ecdc,
		substitution: 0x0ce46c,
	};

	override async run(
		event: Readonly<WorkflowEvent<Params>>,
		step: WorkflowStep,
	) {
		const matchId = await step.do(
			"fetch match id",
			this.getMatchId.bind(this, event.payload.slug),
		);
		let lastCommentId: string | undefined;

		ok(matchId, "Invalid match id");
		rest.setToken(this.env.DISCORD_TOKEN);
		do {
			const newComments = await step.do(
				`commentary ${Date.now()}`,
				this.fetchComments.bind(this, matchId, lastCommentId),
			);

			for (let i = newComments.length - 1; i >= 0; i--) {
				if (newComments[i]!.type === "full time") {
					lastCommentId = undefined;
					break;
				}
				lastCommentId = newComments[i]!.id;
				await step.do<void>(
					`post comment ${lastCommentId}`,
					this.postComment.bind(this, newComments[i]!),
				);
			}
			await step.sleep(`sleep ${Date.now()}`, "10 seconds");
		} while (lastCommentId);
	}

	private async getMatchId(slug: string) {
		return (
			await fetch(`https://legaseriea.it${slug}`).then((res) => res.text())
		).match(/"deltatre_id"\s*:\s*"([^"]+)"/)?.[1];
	}

	private async fetchComments(
		matchId: string,
		lastCommentId: string | undefined,
	) {
		const data = await fetch(
			`https://legaseriea.it/api/stats/v3/live/commentary?match_id=${matchId}&season_id=${this.env.SEASON_ID}`,
		).then((res) => res.json<CommentaryResponse>());

		if (!data.success)
			throw new Error(
				`${data.message}\n${data.errors.map((e) => e.message).join(",")}`,
			);
		const index = lastCommentId
			? data.data.messages.findIndex((m) => m.id === lastCommentId)
			: -1;

		if (index === -1) return data.data.messages.slice(0, 1);
		return data.data.messages.slice(0, index);
	}

	private async postComment(comment: {
		comment: string;
		id: string;
		lastModified: string;
		minute: string;
		period: string;
		second: string;
		time: string;
		type: string;
		varCheck: string;
	}) {
		await rest.post(Routes.channelMessages(this.env.LIVE_MATCH_CHANNEL), {
			body: {
				embeds: [
					{
						color: this.colors[comment.type] ?? 0x3498db,
						title: this.titles[comment.type],
						author:
							Number(comment.period) <= 4 ? { name: comment.time } : undefined,
						description: comment.comment,
						timestamp: comment.lastModified,
					},
				],
			} satisfies RESTPostAPIChannelMessageJSONBody,
		});
	}
}
