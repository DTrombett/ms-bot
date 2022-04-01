import { all, create } from "mathjs";
import { worker } from "workerpool";

const mathNumber = create(all, {
	number: "BigNumber",
});
const mathFraction = create(all, {
	number: "Fraction",
});
const evaluate = (expr: string, fraction: boolean) => {
	const math = fraction ? mathFraction : mathNumber;

	return math.format(math.evaluate(expr));
};

for (const math of [mathNumber, mathFraction])
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
worker({ evaluate });
