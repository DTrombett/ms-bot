import type { AnchorHTMLAttributes, DetailedHTMLProps, ReactNode } from "react";

export default ({
	icon,
	label,
	...props
}: DetailedHTMLProps<
	AnchorHTMLAttributes<HTMLAnchorElement>,
	HTMLAnchorElement
> & { label: string; icon: ReactNode }) => (
	<a
		className="button"
		{...props}
		style={{
			alignItems: "center",
			backgroundColor: "#008545",
			borderRadius: "0.5rem",
			color: "white",
			display: "flex",
			justifyContent: "center",
			padding: "0.5rem 1rem",
			textDecoration: "none",
			width: "113px",
			...props.style,
		}}>
		{icon}
		<span style={{ marginLeft: "0.5rem" }}>{label}</span>
	</a>
);
