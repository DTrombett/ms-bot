import { use, useId, type FunctionComponent } from "react";

// TODO: Find a way to do this while building
export default <P,>(
	filename: string,
	Component: React.FunctionComponent<P>,
): FunctionComponent<{ [K in keyof P]: P[K] | Promise<P[K]> }> =>
	typeof window !== "undefined" ?
		(Component as FunctionComponent<{ [K in keyof P]: P[K] | Promise<P[K]> }>)
	:	(props) => {
			const id = useId();
			const newProps = Object.fromEntries(
				Object.entries(props).map(([k, v]) => [
					k,
					v instanceof Promise ? use(v) : v,
				]),
			);

			return (
				<>
					<div id={id}>
						<Component {...(newProps as any)} />
					</div>
					<script
						type="application/json"
						// TODO: move id to data-component-id
						data-component={filename}
						dangerouslySetInnerHTML={{
							__html: JSON.stringify({ id, props: newProps }).replace(
								/</g,
								"\\u003c",
							),
						}}
					/>
				</>
			);
		};
