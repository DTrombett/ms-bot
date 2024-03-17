export const errorToResponse = (err: TypeError) =>
	new Response(err.message, { status: 401 });
