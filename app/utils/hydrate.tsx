import { hydrateRoot } from "react-dom/client";

export default (App: React.ComponentType) =>
	hydrateRoot(document, <App {...window.PROPS} />);
