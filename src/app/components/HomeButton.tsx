import type { AnchorHTMLAttributes, DetailedHTMLProps, ReactNode } from "react";

export default ({
	icon,
	label,
	...props
}: DetailedHTMLProps<
	AnchorHTMLAttributes<HTMLAnchorElement>,
	HTMLAnchorElement
> & { label: string; icon?: ReactNode }) => (
	<a
		className="button"
		role="button"
		{...props}
		style={{
			alignItems: "center",
			backgroundColor: "#008545",
			borderRadius: "0.5rem",
			color: "white",
			display: "flex",
			fontFamily: "ggsans",
			fontSize: "1.125rem",
			fontWeight: 600,
			justifyContent: "center",
			lineHeight: "1.75rem",
			padding: "0.5rem 1rem",
			textDecoration: "none",
			userSelect: "none",
			...props.style,
		}}>
		{icon}
		<span style={{ marginLeft: icon ? "0.5rem" : undefined }}>{label}</span>
	</a>
);
