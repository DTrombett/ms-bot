/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
import type { WorkflowEntrypoint } from "cloudflare:workers";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { mock } from "node:test";
import { pathToFileURL } from "node:url";
import { parseEnv } from "node:util";
import { caches, fetch, MockAgent, Request, setGlobalDispatcher } from "undici";
import { constant } from "./utils.ts";

const run = async <T>(): Promise<D1Result<T>> => ({
	results: DB.results,
	success: true,
	meta: DB.meta,
});
const first = (colName?: string) =>
	run().then(({ results: [result] }) => result?.[colName as never] ?? null);
const raw: {
	<T = unknown[]>(options: { columnNames: true }): Promise<[string[], ...T[]]>;
	<T = unknown[]>(options?: { columnNames?: false }): Promise<T[]>;
} = ({ columnNames } = {}): Promise<[string[], ...any[]]> =>
	run().then(({ results }) => [
		...((columnNames ? [Object.keys(results[0] ?? {})] : []) as [string[]]),
		...results.map((r) => Object.values(r!)),
	]);
const bind: D1PreparedStatement["bind"] = () => ({
	run,
	all: run,
	bind,
	first,
	raw,
});
const batch: D1Database["batch"] = async () => [await run()];
const prepare: D1Database["prepare"] = () => ({
	bind,
	all: run,
	run,
	first,
	raw,
});
export const DB: D1Database & {
	results: any[];
	meta: D1Meta & Record<string, unknown>;
} = {
	results: [],
	meta: {
		changed_db: false,
		changes: 0,
		duration: 0,
		last_row_id: 0,
		rows_read: 0,
		rows_written: 0,
		size_after: 0,
	},
	prepare,
	batch,
	exec: async () => ({ count: 0, duration: 0 }),
	withSession: () => ({ batch, prepare, getBookmark: () => null }),
	dump: Promise.reject.bind(Promise),
};
export const KV: KVNamespace & { data: NodeJS.Dict<string> } = {
	data: {},
	delete: async (key) => {
		delete KV.data[key];
	},
	get: (async (key: string) => KV.data[key] ?? null) as KVNamespace["get"],
	getWithMetadata: (async (key: string) => ({
		value: KV.data[key] ?? null,
		metadata: null,
		cacheStatus: null,
	})) as KVNamespace["getWithMetadata"],
	list: async (options) => ({
		cacheStatus: null,
		cursor: "",
		keys: Object.keys(KV.data)
			.filter((k) => !options?.prefix || k.startsWith(options.prefix))
			.slice(0, options?.limit ?? 100)
			.map((k) => ({ name: k })),
		list_complete: true,
	}),
	put: async (key, value) => {
		KV.data[key] = (value as string).toString();
	},
};
const parsedEnv = parseEnv(
	await readFile(".test.vars", { encoding: "utf-8" }),
) as Filter<Env, string>;
const additionalEnv: Omit<Filter<Env, object>, keyof Filter<Env, Workflow>> = {
	DB,
	KV,
	ASSETS: {
		connect: () => {
			throw new Error("Not implemented");
		},
		fetch: () => {
			throw new Error("Not implemented");
		},
	},
};
export const env = { ...parsedEnv, ...additionalEnv } as Env;
export const agent = new MockAgent().enableCallHistory();
const cache = await caches.open("default");
type Instance = WorkflowInstance & { promise: Promise<unknown> };
class WorkflowBase implements Workflow {
	instances: Instance[] = [];
	constructor(
		private workflow: Omit<typeof WorkflowEntrypoint, "constructor"> & {
			new (ctx: ExecutionContext<any>, env: any): WorkflowEntrypoint;
		},
	) {}
	public async create({
		id = randomUUID(),
		params,
	}: WorkflowInstanceCreateOptions<unknown> = {}): Promise<Instance> {
		const workflow = new this.workflow(
			{
				waitUntil: () => {},
				passThroughOnException: () => {},
				props: {},
			},
			env,
		);
		const instance: Instance = {
			promise: workflow.run(
				{
					instanceId: id,
					payload: params ?? {},
					timestamp: new Date(),
				},
				{
					do: ({}, config, callback = config) =>
						(callback as () => Promise<void>)(),
					sleep: async () => {},
					sleepUntil: async () => {},
					waitForEvent: async () => ({
						payload: {} as any,
						timestamp: new Date(),
						type: "",
					}),
				},
			),
			id,
			pause: async () => {},
			restart: async () => {},
			resume: async () => {},
			sendEvent: async () => {},
			status: async () => ({ status: "unknown" }),
			terminate: async () => {},
		};

		this.instances.push(instance);
		return instance;
	}
	public async createBatch(
		batch: WorkflowInstanceCreateOptions<unknown>[],
	): Promise<Instance[]> {
		return Promise.all(batch.map((options) => this.create(options)));
	}
	public async get(id: string): Promise<Instance> {
		const instance = this.instances.find((i) => i.id === id);

		if (!instance) throw new Error(`Workflow instance ${id} not found`);
		return instance;
	}
}

registerHooks({
	resolve: (specifier, context, nextResolve) =>
		specifier.startsWith("cloudflare:")
			? {
					url: pathToFileURL("./package.json").href,
					importAttributes: { type: "json" },
					shortCircuit: true,
				}
			: nextResolve(specifier, context),
});
mock.module("cloudflare:workers", {
	namedExports: {
		env,
		WorkflowEntrypoint: class {
			constructor(
				protected ctx: ExecutionContext,
				protected env: Env,
			) {}
		},
		waitUntil: () => {},
	},
});
Object.defineProperties(cache.constructor.prototype, {
	match: { value: constant(Promise.resolve()) },
	put: { value: constant(Promise.resolve()) },
});
Object.defineProperty(caches, "default", { value: cache });
Object.defineProperties(global, {
	caches: { value: caches },
	Request: { value: Request },
	fetch: { value: fetch },
});
setGlobalDispatcher(agent);
export const brawlNotificationsWorkflow = new WorkflowBase(
	(await import("../src/BrawlNotifications.ts")).BrawlNotifications,
);
export const predictionsWorkflow = new WorkflowBase(
	(await import("../src/PredictionsReminders.ts")).PredictionsReminders,
);
export const liveScoreWorkflow = new WorkflowBase(
	(await import("../src/LiveScore.ts")).LiveScore,
);
export const reminderWorkflow = new WorkflowBase(
	(await import("../src/Reminder.ts")).Reminder,
);
const shortenWorkflow = new WorkflowBase(
	(await import("../src/Shorten.ts")).Shorten,
);
env.BRAWL_NOTIFICATIONS = brawlNotificationsWorkflow;
env.PREDICTIONS_REMINDERS = predictionsWorkflow;
env.LIVE_SCORE = liveScoreWorkflow;
env.REMINDER = reminderWorkflow;
env.SHORTEN = shortenWorkflow;
