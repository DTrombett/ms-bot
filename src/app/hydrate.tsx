import { hydrateRoot } from "react-dom/client";

export default (client: Record<string, React.ComponentType>) => {
	for (const [k, App] of Object.entries(client))
		for (const { textContent } of document.querySelectorAll(
			`script[type="application/json"][data-component=${JSON.stringify(k)}]`,
		)) {
			const cp: { props: any; id: string } = JSON.parse(textContent);
			const container = document.getElementById(cp.id);

			if (container) hydrateRoot(container, <App {...cp.props} />);
			else console.error("Hydration failed to find container", cp);
		}
};
