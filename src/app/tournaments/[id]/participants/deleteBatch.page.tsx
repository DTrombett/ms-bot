import { DiscordIdRegex } from "../../../../util/Constants";
import { isAdmin } from "../../../../util/token";
import { unregister } from "../../../../util/tournaments/unregister";
import { UserError } from "../../../../util/UserError";

export const POST: PageHandler = async ({
	json,
	params: [id],
	authenticate,
	request,
	response,
}) => {
	let body: Promise<string[] | null> | string[] | null = request
		.json<string[] | null>()
		.catch(() => null);
	const token = await authenticate();

	if (!token) return json({ message: "Effettua nuovamente il login" }, 401);
	if (!(await isAdmin(token)))
		return json(
			{ message: "Solo gli amministratori possono effettuare questa azione" },
			403,
		);
	body = await body;
	if (!Array.isArray(body) || !body.every((i) => DiscordIdRegex.test(i)))
		return json({ message: "Dati non validi" }, 400);
	if (body.length > 16)
		return json(
			{ message: "Non puoi eliminare più di 16 iscrizioni alla volta" },
			400,
		);
	try {
		await unregister(Number(id), {
			admin: `${token.d ?? token.u} (<@${token.i}>)`,
			userIds: body,
		});
		response.status = 204;
	} catch (err) {
		if (err instanceof UserError) return json({ message: err.message }, 400);
		console.error(err);
		response.status = 500;
	}
	return;
};
