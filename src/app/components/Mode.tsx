import { use } from "react";
import { forceCapitalize } from "../../util/capitalize";
import { TextInput } from "./forms";

export const Mode = ({
	i = 0,
	defaultValue,
	modes,
	required,
}: {
	i?: number;
	defaultValue?: string;
	modes?: { name: string }[];
	required?: boolean;
}) => {
	const iterable = new Set(
		modes?.map(({ name }) => name && forceCapitalize(name)).filter(Boolean),
	);

	return (
		<TextInput
			id={`mode${i}`}
			name={"mode"}
			label="Modalità"
			placeholder="La modalità del torneo (es. Duels)"
			pattern={
				modes &&
				Array.from(iterable)
					.map((v) =>
						typeof RegExp.escape === "function" ? RegExp.escape(v) : v,
					)
					.join("|")
			}
			suggestions={modes && Array.from(iterable, (value) => ({ value }))}
			errorMessage={modes && "Modalità non valida"}
			required={required}
			defaultValue={defaultValue}
		/>
	);
};

export const ModeWithSuggestions = ({
	usable,
	defaultValue,
	required,
}: {
	usable: Promise<{ name: string }[] | undefined>;
	defaultValue?: string;
	required?: boolean;
}) => (
	<Mode modes={use(usable)} required={required} defaultValue={defaultValue} />
);
