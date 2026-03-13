import { DiscordLogo } from "./components/DiscordLogo";
import { Page } from "./components/layout";
import gintoMedium from "./fonts/GintoDiscord-Medium.woff2";
import luckiestGuy from "./fonts/LuckiestGuy-Regular.ttf";
import ggsans from "./fonts/ggsansvf.woff2";
import avatar1 from "./img/avatar/160.avif";
import avatar2 from "./img/avatar/200.avif";
import avatar3 from "./img/avatar/250.avif";
import avatar4 from "./img/avatar/310.avif";
import avatar5 from "./img/avatar/386.avif";

export default ({ styles, url }: { styles: string[]; url: URL }) => (
	<Page
		head={{
			fonts: [gintoMedium, ggsans, { path: luckiestGuy, type: "font/ttf" }],
			styles,
		}}
		url={url}>
		<div
			style={{
				alignItems: "center",
				display: "flex",
				flexDirection: "column",
				flex: 1,
				height: "100%",
				justifyContent: "center",
			}}>
			<div style={{ height: "128px", width: "128px", position: "relative" }}>
				<div
					style={{
						backgroundColor: "#faa61a",
						borderRadius: "100%",
						height: "128px",
						width: "128px",
						position: "absolute",
						zIndex: -1,
					}}>
					<DiscordLogo
						style={{
							width: "77px",
							height: "100%",
							margin: "auto",
							display: "block",
						}}
					/>
				</div>
				<img
					alt=""
					fetchPriority="high"
					height="160"
					width="160"
					sizes="128px"
					src={avatar1}
					srcSet={`${avatar1} 160w, ${avatar2} 200w, ${avatar3} 250w, ${avatar4} 310w, ${avatar5} 386w`}
					style={{
						borderRadius: "100%",
						color: "transparent",
						height: "128px",
						width: "128px",
					}}
				/>
			</div>
			<span
				style={{
					fontFamily: "LuckiestGuy",
					fontSize: "3rem",
					lineHeight: 1,
					margin: "0.5rem 0",
					textShadow: "#0049ff 3px 3px",
					userSelect: "none",
				}}>
				MS BOT
			</span>
			<span
				style={{
					fontFamily: "GintoDiscord",
					fontWeight: 500,
					fontSize: "1.25rem",
					margin: "0.75rem 0",
					textAlign: "center",
					textWrap: "balance",
				}}>
				Il bot ufficiale della community MS
			</span>
			<a
				className="loginButton"
				href="/auth/discord/login"
				rel="nofollow"
				style={{
					alignItems: "center",
					backgroundColor: "#5865f2",
					borderRadius: "0.5rem",
					color: "white",
					cursor: "pointer",
					display: "flex",
					fontFamily: "ggsans",
					fontSize: "1.125rem",
					fontWeight: 600,
					lineHeight: "1.75rem",
					margin: "0.75rem 0",
					padding: "0.5rem 1rem",
					textDecoration: "none",
					transitionDuration: "0.2s",
					transitionProperty: "all",
					transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
					userSelect: "none",
				}}>
				<DiscordLogo
					style={{
						boxSizing: "content-box",
						display: "inline",
						height: "2rem",
						overflow: "visible",
						verticalAlign: "-0.125em",
						width: "2rem",
					}}
				/>
				<span style={{ marginLeft: "0.75rem" }}>Login</span>
			</a>
		</div>
	</Page>
);
