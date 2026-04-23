import { hydrateRoot } from "react-dom/client";
import { jsx } from "react/jsx-runtime";

export default (client: Record<string, React.ComponentType>) =>
	customElements.define(
		"client-component",
		class extends HTMLElement {
			connectedCallback() {
				const App = this.dataset.component && client[this.dataset.component];

				if (this.dataset.props && App)
					hydrateRoot(this, jsx(App, JSON.parse(this.dataset.props)));
				else console.error("Hydration failed to find props or component", this);
			}
		},
	);
