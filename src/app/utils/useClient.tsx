import type { ReactNode } from "react";

export default <P,>(id: string, Component: React.FunctionComponent<P>) =>
	(props: P) =>
		typeof window === "undefined" ?
			<div id={id}>{Component(props) as ReactNode}</div>
		:	Component(props);
