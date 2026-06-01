export const GET: PageHandler = ({ url, request, response, redirect }) => {
	let r = url.searchParams.get("to") ?? request.headers.get("Referer");

	if (r && URL.canParse(r)) r = new URL(r).pathname;
	response.headers.set(
		"Set-Cookie",
		`token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`,
	);
	return redirect(`${r ?? "/"}?logout`, 303);
};
