import { use, type FunctionComponent } from "react";
import { jsx } from "react/jsx-runtime";

// TODO: Find a way to do this while building
export default <P,>(
	filename: string,
	Component: React.FunctionComponent<P>,
): FunctionComponent<{ [K in keyof P]: P[K] | Promise<P[K]> }> =>
	typeof window !== "undefined" ?
		(Component as FunctionComponent<{ [K in keyof P]: P[K] | Promise<P[K]> }>)
	:	(props) =>
			jsx("client-component" as "span", {
				"data-component": filename,
				"data-props": JSON.stringify(
					(props = Object.fromEntries(
						Object.entries(props).map(([k, v]) => [
							k,
							v instanceof Promise ? use(v) : v,
						]),
					) as { [K in keyof P]: P[K] | Promise<P[K]> }),
				),
				children: jsx(Component, props),
			});
