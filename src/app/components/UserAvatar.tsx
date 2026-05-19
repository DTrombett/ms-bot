import type { APIUser } from "discord-api-types/v10";
import type { DetailedHTMLProps, HTMLAttributes } from "react";
import { cdn } from "../utils/cdn";
import DefaultAvatar, { defaultColors } from "./DefaultAvatar";

export default ({
	user,
	size,
	...props
}: DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
	user: Pick<APIUser, "id" | "avatar">;
	size: string;
}) => (
	<div
		{...props}
		style={{
			aspectRatio: 1,
			position: "relative",
			height: size,
			width: size,
			...props.style,
		}}>
		<DefaultAvatar
			size={size}
			style={{
				backgroundColor: defaultColors[Number(BigInt(user.id) >> 22n) % 6],
				position: "absolute",
			}}
		/>
		{user.avatar && (
			<img
				alt=""
				loading="lazy"
				height={16}
				width={16}
				sizes={size}
				src={cdn.avatar(user.id, user.avatar, { size: 16, extension: "webp" })}
				srcSet={[16, 32, 64, 128, 256, 512, 1024, 2048, 4096]
					.map(
						(size) =>
							`${cdn.avatar(user.id, user.avatar!, { size, extension: "webp" })} ${size}w`,
					)
					.join(", ")}
				style={{
					borderRadius: "100%",
					height: size,
					width: size,
					position: "relative",
					zIndex: 1,
				}}
			/>
		)}
	</div>
);
