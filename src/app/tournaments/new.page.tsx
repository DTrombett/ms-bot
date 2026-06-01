import { Brawl } from "../../commands/brawl";
import { isAdmin } from "../../util/token";
import Tournament from "../components/Tournament";
import { Page } from "../components/layout";
import nougat from "../fonts/Nougat-Regular.ttf";

export const GET: PageHandler = async ({
	authenticate,
	head,
	isMobile,
	sendPage,
}) => {
	const modesPromise = Brawl.getModes().catch(
		(error) => void console.error(error),
	);
	const token = await authenticate({ force: true });
	if (!(await isAdmin(token))) return sendPage("/403");
	const mobile = isMobile();

	head.title = "Nuovo torneo";
	head.description =
		"Crea un nuovo torneo con tutte le impostazioni e personalizzazioni";
	return (
		<Page>
			<span
				style={{
					fontFamily: nougat,
					fontSize: "3rem",
					lineHeight: 1,
					margin: mobile ? "2rem 0" : "1rem 0",
					textAlign: "center",
					userSelect: "none",
				}}>
				NUOVO TORNEO
			</span>
			<Tournament mobile={mobile} modesPromise={modesPromise} />
		</Page>
	);
};
