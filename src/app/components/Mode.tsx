import { use } from "react";
import { forceCapitalize } from "../../util/capitalize";
import { TextInput } from "./forms";

export const Mode = ({
	modes,
	required,
}: {
	modes?: { name: string }[];
	required?: boolean;
}) => {
	const iterable = new Set(
		modes?.map(({ name }) => name && forceCapitalize(name)).filter(Boolean),
	);

	return (
		<TextInput
			name="mod"
			label="Modalità"
			placeholder="La modalità del torneo (es. Duels)"
			pattern={modes && Array.from(iterable).join("|")}
			suggestions={modes && Array.from(iterable, (value) => ({ value }))}
			errorMessage={modes && "Modalità non valida"}
			required={required}
		/>
	);
};

export const ModeWithSuggestions = ({
	usable,
	required,
}: {
	usable: Promise<{ name: string }[]>;
	required?: boolean;
}) => <Mode modes={use(usable)} required={required} />;
