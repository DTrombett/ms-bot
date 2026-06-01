export const GET: PageHandler = ({ url, response, redirect, useHeader }) => {
	let r = url.searchParams.get("to") ?? useHeader("Referer");

	if (r && URL.canParse(r)) r = new URL(r).pathname;
	response.headers.set(
		"Set-Cookie",
		`token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`,
	);
	return redirect(`${r ?? "/"}?logout`, 303);
};
