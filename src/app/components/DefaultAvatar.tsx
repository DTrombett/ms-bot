import type { DetailedHTMLProps, HTMLAttributes } from "react";
import { DiscordLogo } from "./DiscordLogo";

export default ({
	size,
	...props
}: DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
	size: string;
}) => (
	<div
		{...props}
		style={{
			borderRadius: "100%",
			display: "flex",
			height: size,
			width: size,
			...props.style,
		}}>
		<DiscordLogo
			style={{ width: `calc(${size} * 0.6)`, margin: "auto", display: "block" }}
		/>
	</div>
);
