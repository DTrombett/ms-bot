import type { ReactNode } from "react";

export const ChannelMention = ({
	mobile = true,
	channel,
	children,
}: {
	mobile?: boolean;
	children: ReactNode;
	channel: string;
}): ReactNode => (
	<a
		className="mention"
		href={`${mobile ? "https://discord.com" : "discord://"}/channels/${channel}`}
		style={{
			color: "#a9bbff",
			cursor: "pointer",
			textDecoration: "none",
			fontWeight: 500,
			borderRadius: "0.25rem",
			backgroundColor: "#5865f23d",
			padding: "0 0.125rem",
			transitionDuration: "0.05s",
		}}>
		<svg
			style={{
				height: "1rem",
				width: "1rem",
				verticalAlign: "middle",
				marginInlineEnd: "0.1rem",
				marginBottom: "0.1rem",
			}}
			aria-label="Channel"
			aria-hidden="false"
			role="img"
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			fill="none"
			viewBox="0 0 24 24">
			<path
				fill="currentColor"
				fillRule="evenodd"
				d="M10.99 3.16A1 1 0 1 0 9 2.84L8.15 8H4a1 1 0 0 0 0 2h3.82l-.67 4H3a1 1 0 1 0 0 2h3.82l-.8 4.84a1 1 0 0 0 1.97.32L8.85 16h4.97l-.8 4.84a1 1 0 0 0 1.97.32l.86-5.16H20a1 1 0 1 0 0-2h-3.82l.67-4H21a1 1 0 1 0 0-2h-3.82l.8-4.84a1 1 0 1 0-1.97-.32L15.15 8h-4.97l.8-4.84ZM14.15 14l.67-4H9.85l-.67 4h4.97Z"
				clipRule="evenodd"
			/>
		</svg>
		{children}
	</a>
);
