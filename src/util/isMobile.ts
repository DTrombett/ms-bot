export const isMobile = (headers: Headers) => {
	if (headers.has("Sec-CH-UA-Mobile"))
		return headers.get("Sec-CH-UA-Mobile") === "?1";
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
		headers.get("User-Agent") ?? "",
	);
};
