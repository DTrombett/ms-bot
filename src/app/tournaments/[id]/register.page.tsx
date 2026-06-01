import { RegistrationMode } from "../../../util/Constants";
import normalizeError from "../../../util/normalizeError";
import { toSearchParams } from "../../../util/objects";
import { register } from "../../../util/tournaments/register";
import { UserError } from "../../../util/UserError";

export const POST: PageHandler = async ({
	redirect,
	params: [id],
	authenticate,
}) => {
	const token = await authenticate({ force: true });

	try {
		await register(Number(id), {
			userId: token.i,
			mode: RegistrationMode.Dashboard,
		});
		return redirect("/tournaments", 303);
	} catch (err) {
		const error = err instanceof UserError ? err : normalizeError(err);

		return redirect(
			`/tournaments?${toSearchParams({
				error: error.name,
				error_description: error instanceof UserError ? error.message : null,
			})}`,
			303,
		);
	}
};
