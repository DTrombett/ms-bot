import Background from "./components/Background";
import { Page } from "./components/layout";
import gintoMedium from "./fonts/GintoDiscord-Medium.woff2";
import ggsans from "./fonts/ggsansvf.woff2";
import avatar1 from "./img/avatar/160.avif";
import avatar2 from "./img/avatar/200.avif";
import avatar3 from "./img/avatar/250.avif";
import avatar4 from "./img/avatar/310.avif";
import avatar5 from "./img/avatar/386.avif";

export default ({ styles }: { styles: string[] }) => (
	<Page head={{ fonts: [gintoMedium, ggsans], styles }}>
		<Background />
		<div
			style={{
				alignItems: "center",
				display: "flex",
				flexDirection: "column",
				flex: 1,
				height: "100%",
				justifyContent: "center",
			}}>
			<img
				alt="MS Bot avatar"
				fetchPriority="high"
				height="160"
				width="160"
				sizes="128px"
				src={avatar1}
				srcSet={`${avatar1} 160w, ${avatar2} 200w, ${avatar3} 250w, ${avatar4} 310w, ${avatar5} 386w`}
				style={{
					borderRadius: "100%",
					width: "128px",
					height: "auto",
					color: "transparent",
				}}
			/>
			<span
				style={{
					textShadow: "#0049ff 3px 3px",
					fontFamily: "Luckiest Guy",
					fontSize: "3rem",
					lineHeight: 1,
					margin: "0.5rem 0",
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
				style={{
					alignItems: "center",
					backgroundColor: "#5865f2",
					borderRadius: "0.5rem",
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
				}}>
				<svg
					id="Discord-Logo"
					xmlns="http://www.w3.org/2000/svg"
					style={{
						overflow: "visible",
						boxSizing: "content-box",
						width: "2rem",
						height: "2rem",
						display: "inline",
						verticalAlign: "-0.125em",
					}}
					viewBox="0 0 126.644 96">
					<path
						id="Discord-Symbol-Light_Blurple"
						style={{ fill: "#e0e3ff" }}
						d="M81.15,0c-1.2376,2.1973-2.3489,4.4704-3.3591,6.794-9.5975-1.4396-19.3718-1.4396-28.9945,0-.985-2.3236-2.1216-4.5967-3.3591-6.794-9.0166,1.5407-17.8059,4.2431-26.1405,8.0568C2.779,32.5304-1.6914,56.3725.5312,79.8863c9.6732,7.1476,20.5083,12.603,32.0505,16.0884,2.6014-3.4854,4.8998-7.1981,6.8698-11.0623-3.738-1.3891-7.3497-3.1318-10.8098-5.1523.9092-.6567,1.7932-1.3386,2.6519-1.9953,20.281,9.547,43.7696,9.547,64.0758,0,.8587.7072,1.7427,1.3891,2.6519,1.9953-3.4601,2.0457-7.0718,3.7632-10.835,5.1776,1.97,3.8642,4.2683,7.5769,6.8698,11.0623,11.5419-3.4854,22.3769-8.9156,32.0509-16.0631,2.626-27.2771-4.496-50.9172-18.817-71.8548C98.9811,4.2684,90.1918,1.5659,81.1752.0505l-.0252-.0505ZM42.2802,65.4144c-6.2383,0-11.4159-5.6575-11.4159-12.6535s4.9755-12.6788,11.3907-12.6788,11.5169,5.708,11.4159,12.6788c-.101,6.9708-5.026,12.6535-11.3907,12.6535ZM84.3576,65.4144c-6.2637,0-11.3907-5.6575-11.3907-12.6535s4.9755-12.6788,11.3907-12.6788,11.4917,5.708,11.3906,12.6788c-.101,6.9708-5.026,12.6535-11.3906,12.6535Z"
					/>
				</svg>
				<span style={{ marginLeft: "0.75rem" }}>Login</span>
			</a>
		</div>
	</Page>
);
