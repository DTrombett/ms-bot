import { RegistrationMode } from "../../../util/Constants";
import normalizeError from "../../../util/normalizeError";
import { toSearchParams } from "../../../util/objects";
import { unregister } from "../../../util/tournaments/unregister";
import { UserError } from "../../../util/UserError";

// TODO: Remove /unregister in favor of DELETE
export const POST: PageHandler = async ({
	redirect,
	params: [id],
	authenticate,
}) => {
	const token = await authenticate({ force: true });

	try {
		await unregister(Number(id), {
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
