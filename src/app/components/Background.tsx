import background from "../img/background/background.avif";

export default () => (
	<img
		alt=""
		fetchPriority="high"
		height="613"
		width="1090"
		src={background}
		style={{
			color: "transparent",
			height: "100vh",
			left: 0,
			objectFit: "cover",
			opacity: 0.2,
			position: "fixed",
			width: "100vw",
			zIndex: -10,
		}}
	/>
);
