import type { ReactNode } from "react";

const errors: Record<string, string | undefined> = {
	invalid_grant: "Il codice di accesso non è valido. Riprova",
	access_denied: "Richiesta di accesso rifiutata",
	invalid_request: "Impossibile effettuare il login al momento",
};

export default ({ url }: { url?: URL }): ReactNode => {
	const errorCode = url?.searchParams.get("error");

	return (
		errorCode != null ?
			<div
				style={{
					animation: "fadeOut 1s ease-in 20s forwards",
					backgroundColor: "rgba(210, 45, 57, 0.8)",
					borderRadius: "1rem",
					bottom: "2rem",
					fontSize: "1.2rem",
					left: "50%",
					maxWidth: "calc(100% - 2rem)",
					padding: "1rem",
					position: "fixed",
					textAlign: "center",
					textWrap: "balance",
					transform: "translate(-50%)",
					userSelect: "none",
				}}>
				{errors[errorCode] ??
					url?.searchParams.get("error_description") ??
					"Impossibile effettuare l'accesso"}
			</div>
		: url?.searchParams.has("login_success") ?
			<div
				style={{
					animation: "fadeInOut 5s ease forwards",
					backgroundColor: "#008545",
					borderRadius: "1rem",
					bottom: "2rem",
					fontSize: "1.2rem",
					left: "50%",
					maxWidth: "calc(100% - 2rem)",
					opacity: 0,
					padding: "1rem",
					position: "fixed",
					textAlign: "center",
					textWrap: "balance",
					userSelect: "none",
				}}>
				Accesso riuscito!
			</div>
		: url?.searchParams.has("logout") ?
			<div
				style={{
					animation: "fadeInOut 5s ease forwards",
					backgroundColor: "#008545",
					borderRadius: "1rem",
					bottom: "2rem",
					fontSize: "1.2rem",
					left: "50%",
					maxWidth: "calc(100% - 2rem)",
					opacity: 0,
					padding: "1rem",
					position: "fixed",
					textAlign: "center",
					textWrap: "balance",
					userSelect: "none",
				}}>
				Disconnessione effettuata con successo!
			</div>
		:	null
	);
};
