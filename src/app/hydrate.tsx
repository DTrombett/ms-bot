import { hydrateRoot } from "react-dom/client";

export default (client: Record<string, React.ComponentType>) => {
	if (window.CP)
		for (const cp of window.CP) {
			const container = document.getElementById(cp.id);
			const App = client[cp.name];

			if (container && App) hydrateRoot(container, <App {...cp.props} />);
			else console.log("Hydration failed to find element or component", cp);
		}
};
