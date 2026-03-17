window.addEventListener("DOMContentLoaded", () => {
	const url = new URL(window.location.href);

	url.searchParams.delete("error_description");
	url.searchParams.delete("error");
	url.searchParams.delete("login_success");
	url.searchParams.delete("logout");
	window.history.replaceState(null, "", url);
});

export default "";
