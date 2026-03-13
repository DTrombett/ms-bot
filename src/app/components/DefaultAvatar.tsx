import type { DetailedHTMLProps, HTMLAttributes } from "react";
import { DiscordLogo } from "./DiscordLogo";

export default ({
	size,
	...props
}: DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
	size: number;
}) => (
	<div
		{...props}
		style={{
			borderRadius: "100%",
			display: "flex",
			height: `${size}px`,
			width: `${size}px`,
			...props.style,
		}}>
		<DiscordLogo
			style={{
				width: `calc(${size}px * 0.6)`,
				margin: "auto",
				display: "block",
			}}
		/>
	</div>
);
