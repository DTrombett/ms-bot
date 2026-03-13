import type { APIUser } from "discord-api-types/v10";
import { DiscordLogo } from "./components/DiscordLogo";
import HomeButton from "./components/HomeButton";
import { Page } from "./components/layout";
import gintoMedium from "./fonts/GintoDiscord-Medium.woff2";
import luckiestGuy from "./fonts/LuckiestGuy-Regular.ttf";
import ggsans from "./fonts/ggsansvf.woff2";
import avatar1 from "./img/avatar/160.avif";
import avatar2 from "./img/avatar/200.avif";
import avatar3 from "./img/avatar/250.avif";
import avatar4 from "./img/avatar/310.avif";
import avatar5 from "./img/avatar/386.avif";

export default ({
	styles,
	url,
	user,
}: {
	styles: string[];
	url: URL;
	user?: Pick<APIUser, "id" | "username" | "avatar" | "global_name">;
}) => (
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
				gap: "1.25rem",
				height: "100%",
				justifyContent: "center",
			}}>
			<div>
				<div
					style={{
						height: "128px",
						width: "128px",
						position: "relative",
						margin: "0 auto 0.5rem auto",
					}}>
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
						draggable="false"
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
						textShadow: "#0049ff 3px 3px",
						userSelect: "none",
					}}>
					MS BOT
				</span>
			</div>
			<span
				style={{
					fontFamily: "GintoDiscord",
					fontWeight: 500,
					fontSize: "1.25rem",
					textAlign: "center",
					textWrap: "balance",
				}}>
				Il bot ufficiale della community MS
			</span>
			<div style={{ display: "flex", gap: "1rem" }}>
				<HomeButton
					label="Pronostici"
					href={`/auth/discord/login?to=${encodeURIComponent("/predictions")}`}
					icon={
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 36 36"
							style={{
								boxSizing: "content-box",
								display: "inline",
								height: "1.5rem",
								width: "1.5rem",
								overflow: "visible",
							}}>
							<circle fill="#F5F8FA" cx="18" cy="18" r="18" />
							<path
								d="M18 11c-.552 0-1-.448-1-1V3c0-.552.448-1 1-1s1 .448 1 1v7c0 .552-.448 1-1 1zm-6.583 4.5c-.1 0-.202-.015-.302-.047l-8.041-2.542c-.527-.167-.819-.728-.652-1.255.166-.527.73-.818 1.255-.652l8.042 2.542c.527.167.819.729.652 1.255-.136.426-.53.699-.954.699zm13.625-.291c-.434 0-.833-.285-.96-.722-.154-.531.151-1.085.682-1.239l6.75-1.958c.531-.153 1.085.153 1.238.682.154.531-.151 1.085-.682 1.239l-6.75 1.958c-.092.027-.186.04-.278.04zm2.001 14.958c-.306 0-.606-.14-.803-.403l-5.459-7.333c-.33-.442-.238-1.069.205-1.399.442-.331 1.069-.238 1.399.205l5.459 7.333c.33.442.238 1.069-.205 1.399-.179.134-.389.198-.596.198zm-18.294-.083c-.197 0-.395-.058-.57-.179-.454-.316-.565-.938-.25-1.392l5.125-7.375c.315-.454.938-.566 1.392-.251.454.315.565.939.25 1.392l-5.125 7.375c-.194.281-.506.43-.822.43zM3.5 27.062c-.44 0-.844-.293-.965-.738L.347 18.262c-.145-.533.17-1.082.704-1.227.535-.141 1.083.171 1.227.704l2.188 8.062c.145.533-.17 1.082-.704 1.226-.088.025-.176.035-.262.035zM22 34h-9c-.552 0-1-.447-1-1s.448-1 1-1h9c.553 0 1 .447 1 1s-.447 1-1 1zm10.126-6.875c-.079 0-.16-.009-.24-.029-.536-.132-.864-.674-.731-1.21l2.125-8.625c.133-.536.679-.862 1.21-.732.536.132.864.674.731 1.211l-2.125 8.625c-.113.455-.521.76-.97.76zM30.312 7.688c-.17 0-.342-.043-.5-.134L22.25 3.179c-.478-.277-.642-.888-.364-1.367.275-.478.886-.643 1.366-.365l7.562 4.375c.478.277.642.888.364 1.367-.185.32-.521.499-.866.499zm-24.811 0c-.312 0-.618-.145-.813-.417-.322-.45-.22-1.074.229-1.396l6.188-4.438c.449-.322 1.074-.219 1.396.229.322.449.219 1.074-.229 1.396L6.083 7.5c-.177.126-.38.188-.582.188z"
								fill="#CCD6DD"
							/>
							<path
								d="M25.493 13.516l-7.208-5.083c-.348-.245-.814-.243-1.161.006l-7.167 5.167c-.343.248-.494.684-.375 1.091l2.5 8.583c.124.426.515.72.96.72H22c.43 0 .81-.274.948-.681l2.917-8.667c.141-.419-.011-.881-.372-1.136zM1.292 19.542c.058 0 .117-.005.175-.016.294-.052.55-.233.697-.494l3.375-6c.051-.091.087-.188.108-.291L6.98 6.2c.06-.294-.016-.6-.206-.832C6.584 5.135 6.3 5 6 5h-.428C2.145 8.277 0 12.884 0 18c0 .266.028.525.04.788l.602.514c.182.156.413.24.65.24zm9.325-16.547c.106.219.313.373.553.412l6.375 1.042c.04.006.081.01.121.01.04 0 .081-.003.122-.01l6.084-1c.2-.033.38-.146.495-.314.116-.168.158-.375.118-.575l-.292-1.443C22.26.407 20.18 0 18 0c-2.425 0-4.734.486-6.845 1.356l-.521.95c-.117.213-.123.47-.017.689zm20.517 2.724l-1.504-.095c-.228-.013-.455.076-.609.249-.152.173-.218.402-.175.63l1.167 6.198c.017.086.048.148.093.224 1.492 2.504 3.152 5.301 3.381 5.782.024.084.062.079.114.151.14.195.372.142.612.142h.007c.198 0 .323.094 1.768-.753.001-.083.012-.164.012-.247 0-4.753-1.856-9.064-4.866-12.281zM14.541 33.376c.011-.199-.058-.395-.191-.544l-4.5-5c-.06-.066-.131-.122-.211-.163-5.885-3.069-5.994-3.105-6.066-3.13-.078-.025-.161-.039-.242-.039-.537 0-.695.065-1.185 2.024 2.236 4.149 6.053 7.316 10.644 8.703l1.5-1.333c.149-.132.239-.319.251-.518zm17.833-8.567c-.189-.08-.405-.078-.592.005l-6.083 2.667c-.106.046-.2.116-.274.205l-4.25 5.083c-.129.154-.19.352-.172.552.02.2.117.384.272.51.683.559 1.261 1.03 1.767 1.44 4.437-1.294 8.154-4.248 10.454-8.146l-.712-1.889c-.072-.193-.221-.347-.41-.427z"
								fill="#31373D"
							/>
						</svg>
					}
				/>
				<HomeButton
					label="Tornei"
					href={`/auth/discord/login?to=${encodeURIComponent("/tournaments")}`}
					icon={
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 36 36"
							style={{
								boxSizing: "content-box",
								display: "inline",
								height: "1.5rem",
								width: "1.5rem",
								overflow: "visible",
							}}>
							<path
								fill="#FFAC33"
								d="M5.123 5h6C12.227 5 13 4.896 13 6V4c0-1.104-.773-2-1.877-2h-8c-2 0-3.583 2.125-3 5 0 0 1.791 9.375 1.917 9.958C2.373 18.5 4.164 20 6.081 20h6.958c1.105 0-.039-1.896-.039-3v-2c0 1.104-.773 2-1.877 2h-4c-1.104 0-1.833-1.042-2-2S3.539 7.667 3.539 7.667C3.206 5.75 4.018 5 5.123 5zm25.812 0h-6C23.831 5 22 4.896 22 6V4c0-1.104 1.831-2 2.935-2h8c2 0 3.584 2.125 3 5 0 0-1.633 9.419-1.771 10-.354 1.5-2.042 3-4 3h-7.146C21.914 20 22 18.104 22 17v-2c0 1.104 1.831 2 2.935 2h4c1.104 0 1.834-1.042 2-2s1.584-7.333 1.584-7.333C32.851 5.75 32.04 5 30.935 5zM20.832 22c0-6.958-2.709 0-2.709 0s-3-6.958-3 0-3.291 10-3.291 10h12.292c-.001 0-3.292-3.042-3.292-10z"
							/>
							<path
								fill="#FFCC4D"
								d="M29.123 6.577c0 6.775-6.77 18.192-11 18.192-4.231 0-11-11.417-11-18.192 0-5.195 1-6.319 3-6.319 1.374 0 6.025-.027 8-.027l7-.001c2.917-.001 4 .684 4 6.347z"
							/>
							<path
								fill="#C1694F"
								d="M27 33c0 1.104.227 2-.877 2h-16C9.018 35 9 34.104 9 33v-1c0-1.104 1.164-2 2.206-2h13.917c1.042 0 1.877.896 1.877 2v1z"
							/>
							<path
								fill="#C1694F"
								d="M29 34.625c0 .76.165 1.375-1.252 1.375H8.498C7.206 36 7 35.385 7 34.625v-.25C7 33.615 7.738 33 8.498 33h19.25c.759 0 1.252.615 1.252 1.375v.25z"
							/>
						</svg>
					}
				/>
			</div>
			{user ?
				<HomeButton
					href="/auth/discord/logout"
					label="Log out"
					icon={
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
					}
					style={{ backgroundColor: "#D22D39", width: undefined }}
				/>
			:	<HomeButton
					href="/auth/discord/login"
					label="Login"
					icon={
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
					}
					style={{ backgroundColor: "#5865f2", width: undefined }}
				/>
			}
		</div>
	</Page>
);
