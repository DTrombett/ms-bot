import * as commands from "../commands";
import { CommandHandler } from "../util/CommandHandler";

const handler = new CommandHandler(Object.values(commands));

export const POST: PageHandler = ({ request }) =>
	handler.handleInteraction(request).catch((e) => {
		if (e instanceof Response) return e;
		console.error(e);
		return new Response(null, { status: 500 });
	});
