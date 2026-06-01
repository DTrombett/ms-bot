import { parseForm, ParseType } from "../../../util/forms";
import { pick } from "../../../util/objects";
import { isAdmin } from "../../../util/token";
import { register } from "../../../util/tournaments/register";
import { UserError } from "../../../util/UserError";

export const POST: PageHandler = async ({
	json,
	params: [id],
	authenticate,
	request,
	response,
}) => {
	let body: Promise<FormData | null> | FormData | null = request
		.formData()
		.catch(() => null);
	const token = await authenticate();
	if (!token) return json({ message: "Effettua nuovamente il login" }, 401);
	if (!(await isAdmin(token)))
		return json(
			{ message: "Questa azione è riservata agli amministratori" },
			403,
		);
	body = await body;
	if (!body) return json({ message: "Dati non validi" }, 400);
	const data = parseForm(body, { userId: ParseType.Text, tag: ParseType.Text });

	if (!data.userId) return json({ message: "L'ID utente è obbligatorio" }, 400);
	try {
		return json(
			pick<Awaited<ReturnType<typeof register>>, keyof Database.Participant>(
				await register(Number(id), {
					userId: data.userId,
					admin: `${token.d ?? token.u} (<@${token.i}>)`,
					tag: data.tag ?? undefined,
				}),
				"name",
				"tag",
				"tournamentId",
				"userId",
			),
		);
	} catch (err) {
		if (err instanceof UserError) return json({ message: err.message }, 400);
		console.error(err);
		response.status = 500;
		return;
	}
};
