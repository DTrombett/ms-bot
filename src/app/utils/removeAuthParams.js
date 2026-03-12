window.addEventListener("DOMContentLoaded", () => {
	const url = new URL(window.location.href);

	url.searchParams.delete("login_success");
	url.searchParams.delete("error");
	url.searchParams.delete("error_message");
	window.history.replaceState(null, "", url);
});

export default "";
