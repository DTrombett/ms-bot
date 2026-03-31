import type {
	CSSProperties,
	DetailedHTMLProps,
	HTMLAttributes,
	ReactNode,
} from "react";

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
		display: "flex",
		marginBlock: "0.25em",
	},
	checkboxLabel: {
		cursor: "pointer",
		fontFamily: "ggsans",
		fontSize: "1.125rem",
		fontWeight: 600,
		lineHeight: "normal",
		marginLeft: "0.25rem",
		width: "stretch",
	},
	field: { marginBlock: "1em" },
	label: { display: "block", marginLeft: "0.125rem", cursor: "text" },
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
		maxWidth: "16rem",
		padding: "0.25rem 0.5rem",
		width: "stretch",
	},
} as const satisfies Record<string, CSSProperties>;

export const Section = ({
	children,
	title,
}: {
	children: ReactNode;
	title?: string;
}) => (
	<section>
		<h2 style={{ fontWeight: "normal", marginBlock: "0.25em 0.5em" }}>
			{title}
		</h2>
		{children}
	</section>
);

export const TextInput = ({
	label,
	name,
	placeholder,
	defaultValue,
	errorMessage,
	id,
	maxWidth,
	note,
	pattern,
	required,
	suggestions,
	...props
}: {
	label: string;
	name: string;
	placeholder: string;
	defaultValue?: string;
	errorMessage?: string;
	id?: string;
	maxWidth?: string;
	note?: string;
	pattern?: string;
	required?: boolean;
	suggestions?: { label?: string; value: string }[];
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>) => (
	<div
		{...props}
		style={{ ...styles.field, ...props.style }}
		data-errormessage={errorMessage}>
		<label htmlFor={id} style={styles.label}>
			{label}
		</label>
		<span
			style={{
				color: "yellow",
				display: "block",
				fontFamily: "ggsans",
				fontSize: "1rem",
				lineHeight: "normal",
			}}>
			{note}
		</span>
		<input
			type="text"
			name={name}
			id={id}
			placeholder={placeholder}
			defaultValue={defaultValue}
			list={suggestions && `${id}-list`}
			pattern={pattern}
			required={required}
			style={{ ...styles.textInput, ...(maxWidth && { maxWidth }) }}
		/>
		{suggestions && (
			<datalist id={`${id}-list`}>
				{suggestions.map((s) => (
					<option value={s.value} label={s.label} key={s.value} />
				))}
			</datalist>
		)}
	</div>
);

export const CheckboxInput = ({
	label,
	name,
	defaultChecked,
	required,
	...props
}: {
	label: string;
	name: string;
	defaultChecked?: boolean;
	required?: boolean;
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>) => (
	<div {...props} style={{ ...styles.checkboxField, ...props.style }}>
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
	default: defaultChecked,
	...props
}: {
	label: string;
	name: string;
	default?: string | number | readonly string[];
	options: {
		label: string;
		value: string | number | readonly string[];
		id?: string;
	}[];
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>) => (
	<div {...props} style={{ ...styles.field, ...props.style }}>
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
						defaultChecked={defaultChecked === op.value}
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
	...props
}: {
	label: string;
	options: {
		id: string;
		label: string;
		defaultChecked?: boolean;
		required?: boolean;
	}[];
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>) => (
	<div {...props} style={{ ...styles.field, ...props.style }}>
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
	...props
}: {
	label: string;
	name: string;
	defaultValue?: string;
	required?: boolean;
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>) => (
	<div {...props} style={{ ...styles.field, ...props.style }}>
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

export const NumberInput = ({
	label,
	name,
	placeholder,
	defaultValue,
	id,
	max,
	min,
	width,
	required,
	step,
	...props
}: {
	label: string;
	name: string;
	placeholder: string;
	defaultValue?: number;
	id?: string;
	max?: number;
	min?: number;
	required?: boolean;
	step?: number;
	width?: string;
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>) => (
	<div {...props} style={{ ...styles.field, ...props.style }}>
		<label htmlFor={id} style={styles.label}>
			{label}
		</label>
		<input
			type="number"
			name={name}
			placeholder={placeholder}
			id={id}
			defaultValue={defaultValue}
			max={max}
			min={min}
			style={{ ...styles.textInput, width, maxWidth: "stretch" }}
			step={step}
			required={required}
		/>
	</div>
);
