import { hydrateRoot } from "react-dom/client";

export default (client: Record<string, React.ComponentType>) => {
	for (const [elementId, App] of Object.entries(client)) {
		const container = document.getElementById(elementId);

		if (container) hydrateRoot(container, <App {...window.PROPS} />);
		else console.log("Hydration failed to find element", elementId);
	}
};
