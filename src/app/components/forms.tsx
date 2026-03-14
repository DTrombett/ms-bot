import type { CSSProperties } from "react";

const textInputStyle: CSSProperties = {
	fontFamily: "ggsans",
	fontSize: "1rem",
	lineHeight: "1.5rem",
	backgroundColor: "#22232740",
	borderRadius: "4px",
	marginTop: "0.5rem",
	padding: "0.25rem 0.5rem",
	color: "white",
	fontWeight: 500,
	borderColor: "rgba(255, 255, 255, 0.2)",
	borderStyle: "solid",
	borderWidth: "0.8px",
	width: "stretch",
	maxWidth: "256px",
};
const radioGroupStyle: CSSProperties = {
	fontFamily: "ggsans",
	fontSize: "1rem",
	lineHeight: "1.5rem",
	marginTop: "0.5rem",
	fontWeight: 500,
	display: "flex",
	flexDirection: "column",
	gap: "0.125rem",
};
const radioElementStyle: CSSProperties = {
	display: "flex",
	alignItems: "center",
};
const radioInputStyle: CSSProperties = { margin: "0 0.5rem 0 0.125rem" };
const fieldStyle = { marginBlock: "1em" };
const labelStyle = { display: "block", marginLeft: "0.125rem" };

export const TextInput = ({
	name,
	placeholder,
	label,
}: {
	name: string;
	placeholder: string;
	label: string;
}) => (
	<div style={fieldStyle}>
		<label htmlFor={name} style={labelStyle}>
			{label}
		</label>
		<input
			type="text"
			name={name}
			id={name}
			placeholder={placeholder}
			style={textInputStyle}
		/>
	</div>
);

export const RadioInput = ({
	label,
	name,
	options,
}: {
	label: string;
	name: string;
	options: {
		label: string;
		value: string | number | readonly string[];
		id?: string;
	}[];
}) => (
	<div style={fieldStyle}>
		<span style={labelStyle}>{label}</span>
		<div style={radioGroupStyle}>
			{options.map((op) => (
				<div style={radioElementStyle} key={op.id ?? String(op.value)}>
					<input
						type="radio"
						id={op.id ?? String(op.value)}
						name={name}
						value={op.value}
						style={radioInputStyle}
					/>
					<label htmlFor={op.id ?? String(op.value)}>{op.label}</label>
				</div>
			))}
		</div>
	</div>
);
