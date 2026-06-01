import { RegistrationMode } from "../../../../util/Constants";
import { isAdmin } from "../../../../util/token";
import { unregister } from "../../../../util/tournaments/unregister";
import { UserError } from "../../../../util/UserError";

export const DELETE: PageHandler = async ({
	json,
	params: [id, participantId],
	authenticate,
	response,
}) => {
	const token = await authenticate();
	if (!token) return json({ message: "Effettua nuovamente il login" }, 401);
	const admin = await isAdmin(token);
	if (token.i !== participantId && !admin)
		return json(
			{ message: "Solo gli amministratori possono effettuare questa azione" },
			403,
		);
	try {
		await unregister(Number(id), {
			admin: admin ? `${token.d ?? token.u} (<@${token.i}>)` : false,
			userId: participantId!,
			mode: RegistrationMode.Dashboard,
		});
		response.status = 204;
	} catch (err) {
		if (err instanceof UserError) return json({ message: err.message }, 400);
		console.error(err);
		response.status = 500;
	}
	return;
};
