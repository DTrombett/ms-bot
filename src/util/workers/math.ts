import type { UnitDefinition } from "mathjs";
import { all, create } from "mathjs";
import { worker } from "workerpool";
import CustomClient from "../CustomClient";

const mathNumber = create(all, {
	number: "BigNumber",
});
const mathFraction = create(all, {
	number: "Fraction",
});
const units: Record<string, UnitDefinition> = {
	knot: {
		definition: "0.514444444 m/s",
		aliases: ["knot", "knots", "kt", "kts", "kn"],
	},
	mph: {
		definition: "0.44704 m/s",
		aliases: ["miles per hour", "mph", "mile per hour", "MPH", "mi/h"],
	},
};
const evaluate = (expr: string, fraction: boolean) => {
	const math = fraction ? mathFraction : mathNumber;

	return math.format(math.evaluate(expr));
};

for (const math of [mathNumber, mathFraction]) {
	for (const unit in units)
		if (Object.hasOwn(units, unit)) math.createUnit(unit, units[unit]);
	math.import(
		{
			range: () => {
				throw new Error(
					"La funzione `range` è disattivata per motivi di sicurezza"
				);
			},
			import: () => {
				throw new Error(
					"La funzione `import` è disattivata per motivi di sicurezza. Puoi suggerire nuove funzioni in <#816768278675849318>"
				);
			},
			createUnit: (message: unknown) => {
				CustomClient.printToStdout("Suggested new unit:");
				CustomClient.printToStdout(message);
				throw new Error(
					"La funzione `createUnit` è disattivata per motivi di sicurezza. Suggerisci unità di misura mancanti in <#816768278675849318>"
				);
			},
			simplify: () => {
				throw new Error(
					"La funzione `simplify` è disattivata per motivi di sicurezza"
				);
			},
			derivative: () => {
				throw new Error(
					"La funzione `derivative` è disattivata per motivi di sicurezza"
				);
			},
		},
		{ override: true }
	);
}
worker({ evaluate });
