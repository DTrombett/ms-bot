import type { UnitDefinition } from "mathjs";
import { all, create } from "mathjs";
import { worker } from "workerpool";

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
				throw new Error("Function range is disabled for security reasons");
			},
			import: () => {
				throw new Error("Function import is disabled for security reasons");
			},
			createUnit: () => {
				throw new Error("Function createUnit is disabled for security reasons");
			},
			simplify: () => {
				throw new Error("Function simplify is disabled for security reasons");
			},
			derivative: () => {
				throw new Error("Function derivative is disabled for security reasons");
			},
		},
		{ override: true }
	);
}
worker({ evaluate });
