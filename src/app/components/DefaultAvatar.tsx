import type { DetailedHTMLProps, HTMLAttributes } from "react";
import { DiscordLogo } from "./DiscordLogo";

export const defaultColors = [
	"#5865f2",
	"#757e8a",
	"#3ba55c",
	"#faa61a",
	"#ed4245",
	"#eb459f",
];

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
