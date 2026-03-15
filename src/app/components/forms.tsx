import type { CSSProperties, ReactNode } from "react";

export const styles = {
	boxElement: { display: "flex", alignItems: "center", cursor: "pointer" },
	boxGroup: {
		display: "flex",
		flexDirection: "column",
		fontFamily: "ggsans",
		fontSize: "1rem",
		fontWeight: 500,
		gap: "0.125rem",
		lineHeight: "1.5rem",
		marginTop: "0.5rem",
	},
	boxInput: { margin: "0 0.5rem 0 0.125rem", cursor: "pointer" },
	boxLabel: { width: "stretch", cursor: "pointer" },
	checkbox: {
		cursor: "pointer",
		height: "1rem",
		marginLeft: "0.125rem",
		width: "1rem",
	},
	checkboxField: {
		alignItems: "center",
		cursor: "pointer",
		display: "flex",
		marginBlockStart: "0.25em",
	},
	checkboxLabel: {
		cursor: "pointer",
		fontFamily: "ggsans",
		fontSize: "1.125rem",
		fontWeight: 600,
		lineHeight: "1.75rem",
		marginLeft: "0.25rem",
		width: "stretch",
	},
	field: { marginBlock: "1em" },
	label: { display: "block", marginLeft: "0.125rem" },
	textInput: {
		backgroundColor: "#22232740",
		borderColor: "rgba(255, 255, 255, 0.2)",
		borderRadius: "4px",
		borderStyle: "solid",
		borderWidth: "0.8px",
		color: "white",
		fontFamily: "ggsans",
		fontSize: "1rem",
		fontWeight: 500,
		lineHeight: "1.5rem",
		marginTop: "0.5rem",
		maxWidth: "256px",
		padding: "0.25rem 0.5rem",
		width: "stretch",
	},
} satisfies Record<string, CSSProperties>;

export const Section = ({
	children,
	title,
}: {
	children: ReactNode;
	title?: string;
}) => (
	<section>
		<h2 style={{ fontWeight: "normal", marginBlock: "0 0.5em" }}>{title}</h2>
		{children}
	</section>
);

export const TextInput = ({
	label,
	name,
	placeholder,
	defaultValue,
	maxWidth,
	required,
}: {
	label: string;
	name: string;
	placeholder: string;
	defaultValue?: string;
	maxWidth?: string;
	required?: boolean;
}) => (
	<div style={styles.field}>
		<label htmlFor={name} style={styles.label}>
			{label}
		</label>
		<input
			type="text"
			name={name}
			id={name}
			placeholder={placeholder}
			defaultValue={defaultValue}
			required={required}
			style={{ ...styles.textInput, ...(maxWidth && { maxWidth }) }}
		/>
	</div>
);

export const CheckboxInput = ({
	label,
	name,
	defaultChecked,
	required,
}: {
	label: string;
	name: string;
	defaultChecked?: boolean;
	required?: boolean;
}) => (
	<div style={styles.checkboxField}>
		<input
			type="checkbox"
			name={name}
			id={name}
			style={styles.checkbox}
			defaultChecked={defaultChecked}
			required={required}
		/>
		<label htmlFor={name} style={styles.checkboxLabel}>
			{label}
		</label>
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
		defaultChecked?: boolean;
		id?: string;
	}[];
}) => (
	<div style={styles.field}>
		<span style={styles.label}>{label}</span>
		<div style={styles.boxGroup}>
			{options.map((op) => (
				<div style={styles.boxElement} key={op.id ?? String(op.value)}>
					<input
						type="radio"
						id={op.id ?? String(op.value)}
						name={name}
						value={op.value}
						style={styles.boxInput}
						defaultChecked={op.defaultChecked}
					/>
					<label htmlFor={op.id ?? String(op.value)} style={styles.boxLabel}>
						{op.label}
					</label>
				</div>
			))}
		</div>
	</div>
);

export const CheckboxListInput = ({
	label,
	options,
}: {
	label: string;
	options: {
		id: string;
		label: string;
		defaultChecked?: boolean;
		required?: boolean;
	}[];
}) => (
	<div style={styles.field}>
		<span style={styles.label}>{label}</span>
		<div style={styles.boxGroup}>
			{options.map((op) => (
				<div style={styles.boxElement} key={op.id}>
					<input
						type="checkbox"
						id={op.id}
						name={op.id}
						style={styles.boxInput}
						defaultChecked={op.defaultChecked}
						required={op.required}
					/>
					<label htmlFor={op.id} style={styles.boxLabel}>
						{op.label}
					</label>
				</div>
			))}
		</div>
	</div>
);

export const DateTimeInput = ({
	label,
	name,
	defaultValue,
	required,
}: {
	label: string;
	name: string;
	defaultValue?: string;
	required?: boolean;
}) => (
	<div style={styles.field}>
		<label htmlFor={name} style={styles.label}>
			{label}
		</label>
		<input
			type="datetime-local"
			name={name}
			id={name}
			defaultValue={defaultValue}
			style={{ ...styles.textInput, width: undefined, maxWidth: "stretch" }}
			required={required}
		/>
	</div>
);
