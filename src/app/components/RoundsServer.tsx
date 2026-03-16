import { use } from "react";
import Rounds from "./Rounds";

export const RoundsServer = ({
	usable,
}: {
	usable: Promise<{ name: string }[]>;
}) => {
	const modes = use(usable);
	return (
		<>
			<Rounds modes={modes} />
			<script
				dangerouslySetInnerHTML={{
					__html: `window.PROPS??={};window.PROPS.modes=${JSON.stringify(modes)}`,
				}}
			/>
		</>
	);
};
