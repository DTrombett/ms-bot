import pages from "build:routes";

export const findRoute = (url: URL): Router | null => {
	const params: string[] = [];
	let route: Route | undefined = pages;

	for (const fragment of url.pathname.split("/"))
		// Ignore first, leading and multiple /, so /a//b/ == a/b
		if (!fragment) continue;
		else if (route[fragment]) route = route[fragment];
		else {
			// [] is a catch-all
			route = route["[]"];
			params.push(fragment);
			if (!route) break;
		}
	return route?.index ? { route: route.index, params } : null;
};
