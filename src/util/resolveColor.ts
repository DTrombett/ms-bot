export type RGB = [r: number, g: number, b: number];

const epsilon = 1 / 100_000;

/**
 * @param hue - Hue as degrees 0..360
 * @param sat - Saturation in reference range [0,100]
 * @param light - Lightness in reference range [0,100]
 * @return Array of sRGB components; in-gamut colors in range [0..256]
 */
export const hslToRgb = (hue: number, sat: number, light: number): RGB => {
	sat /= 100;
	light /= 100;
	const f = (n: number) => {
		const k = (n + hue / 30) % 12;

		return Math.floor(
			(light -
				sat *
					Math.min(light, 1 - light) *
					Math.max(-1, Math.min(k - 3, 9 - k, 1))) *
				255 +
				0.5,
		);
	};
	return [f(0), f(8), f(4)];
};

/**
 * @param red - Red component 0..255
 * @param green - Green component 0..255
 * @param blue - Blue component 0..255
 * @return Array of HSL values: Hue as degrees 0..360, Saturation and Lightness in reference range [0,100]
 */
export const rgbToHsl = (
	red: number,
	green: number,
	blue: number,
): [hue: number, sat: number, light: number] => {
	red /= 255;
	green /= 255;
	blue /= 255;
	const max = Math.max(red, green, blue);
	const min = Math.min(red, green, blue);
	// eslint-disable-next-line prefer-const
	let [hue, sat, light] = [NaN, 0, (min + max) / 2];
	const d = max - min;

	if (d !== 0) {
		sat =
			light === 0 || light === 1
				? 0
				: (max - light) / Math.min(light, 1 - light);
		switch (max) {
			case red:
				hue = (green - blue) / d + (green < blue ? 6 : 0);
				break;
			case green:
				hue = (blue - red) / d + 2;
				break;
			case blue:
				hue = (red - green) / d + 4;
				break;
			default:
		}
		hue *= 60;
	}
	// Very out of gamut colors can produce negative saturation
	// If so, just rotate the hue by 180 and use a positive saturation
	// see https://github.com/w3c/csswg-drafts/issues/9222
	if (sat < 0) {
		hue += 180;
		sat = Math.abs(sat);
	}
	if (hue >= 360) hue -= 360;
	if (sat <= epsilon) hue = NaN;
	return [hue, sat * 100, light * 100];
};

/**
 * @param hue -  Hue as degrees 0..360
 * @param white -  Whiteness in reference range [0,100]
 * @param black -  Blackness in reference range [0,100]
 * @return Array of RGB components 0..255
 */
export const hwbToRgb = (hue: number, white: number, black: number): RGB => {
	white /= 100;
	black /= 100;
	if (white + black >= 1) {
		const gray = white / (white + black);

		return [gray, gray, gray];
	}
	const rgb = hslToRgb(hue, 100, 50);
	for (let i = 0; i < 3; i++) {
		rgb[i]! /= 255;
		rgb[i]! *= 1 - white - black;
		rgb[i]! += white;
		rgb[i] = Math.floor(rgb[i]! * 255 + 0.5);
	}
	return rgb;
};

/**
 * Similar to rgbToHsl, except that saturation and lightness are not calculated, and
 * potential negative saturation is ignored.
 * @param {number} red - Red component 0..255
 * @param {number} green - Green component 0..255
 * @param {number} blue - Blue component 0..255
 * @return {number} Hue as degrees 0..360
 */
export const rgbToHue = (red: number, green: number, blue: number): number => {
	red /= 255;
	green /= 255;
	blue /= 255;
	const max = Math.max(red, green, blue);
	let hue = NaN;
	const d = max - Math.min(red, green, blue);

	if (d !== 0) {
		switch (max) {
			case red:
				hue = (green - blue) / d + (green < blue ? 6 : 0);
				break;
			case green:
				hue = (blue - red) / d + 2;
				break;
			case blue:
				hue = (red - green) / d + 4;
				break;
			default:
		}
		hue *= 60;
	}
	if (hue >= 360) hue -= 360;
	return hue;
};

/**
 * @param {number} red - Red component 0..255
 * @param {number} green - Green component 0..255
 * @param {number} blue - Blue component 0..255
 * @return {number[]} Array of HWB values: Hue as degrees 0..360, Whiteness and Blackness in reference range [0,100]
 */
export const rgbToHwb = (
	red: number,
	green: number,
	blue: number,
): [hue: number, white: number, black: number] => {
	red /= 255;
	green /= 255;
	blue /= 255;
	const white = Math.min(red, green, blue);
	const black = 1 - Math.max(red, green, blue);
	let hue = rgbToHue(red, green, blue);

	if (white + black >= 1 - epsilon) hue = NaN;
	return [hue, white * 100, black * 100];
};

//#region Named colors
const namedColors: Record<string, RGB> = {
	aliceblue: [240, 248, 255],
	antiquewhite: [250, 235, 215],
	aqua: [0, 255, 255],
	aquamarine: [127, 255, 212],
	azure: [240, 255, 255],
	beige: [245, 245, 220],
	bisque: [255, 228, 196],
	black: [0, 0, 0],
	blanchedalmond: [255, 235, 205],
	blue: [0, 0, 255],
	blueviolet: [138, 43, 226],
	brown: [165, 42, 42],
	burlywood: [222, 184, 135],
	cadetblue: [95, 158, 160],
	chartreuse: [127, 255, 0],
	chocolate: [210, 105, 30],
	coral: [255, 127, 80],
	cornflowerblue: [100, 149, 237],
	cornsilk: [255, 248, 220],
	crimson: [220, 20, 60],
	cyan: [0, 255, 255],
	darkblue: [0, 0, 139],
	darkcyan: [0, 139, 139],
	darkgoldenrod: [184, 134, 11],
	darkgray: [169, 169, 169],
	darkgreen: [0, 100, 0],
	darkgrey: [169, 169, 169],
	darkkhaki: [189, 183, 107],
	darkmagenta: [139, 0, 139],
	darkolivegreen: [85, 107, 47],
	darkorange: [255, 140, 0],
	darkorchid: [153, 50, 204],
	darkred: [139, 0, 0],
	darksalmon: [233, 150, 122],
	darkseagreen: [143, 188, 143],
	darkslateblue: [72, 61, 139],
	darkslategray: [47, 79, 79],
	darkslategrey: [47, 79, 79],
	darkturquoise: [0, 206, 209],
	darkviolet: [148, 0, 211],
	deeppink: [255, 20, 147],
	deepskyblue: [0, 191, 255],
	dimgray: [105, 105, 105],
	dimgrey: [105, 105, 105],
	dodgerblue: [30, 144, 255],
	firebrick: [178, 34, 34],
	floralwhite: [255, 250, 240],
	forestgreen: [34, 139, 34],
	fuchsia: [255, 0, 255],
	gainsboro: [220, 220, 220],
	ghostwhite: [248, 248, 255],
	gold: [255, 215, 0],
	goldenrod: [218, 165, 32],
	gray: [128, 128, 128],
	green: [0, 128, 0],
	greenyellow: [173, 255, 47],
	grey: [128, 128, 128],
	honeydew: [240, 255, 240],
	hotpink: [255, 105, 180],
	indianred: [205, 92, 92],
	indigo: [75, 0, 130],
	ivory: [255, 255, 240],
	khaki: [240, 230, 140],
	lavender: [230, 230, 250],
	lavenderblush: [255, 240, 245],
	lawngreen: [124, 252, 0],
	lemonchiffon: [255, 250, 205],
	lightblue: [173, 216, 230],
	lightcoral: [240, 128, 128],
	lightcyan: [224, 255, 255],
	lightgoldenrodyellow: [250, 250, 210],
	lightgray: [211, 211, 211],
	lightgreen: [144, 238, 144],
	lightgrey: [211, 211, 211],
	lightpink: [255, 182, 193],
	lightsalmon: [255, 160, 122],
	lightseagreen: [32, 178, 170],
	lightskyblue: [135, 206, 250],
	lightslategray: [119, 136, 153],
	lightslategrey: [119, 136, 153],
	lightsteelblue: [176, 196, 222],
	lightyellow: [255, 255, 224],
	lime: [0, 255, 0],
	limegreen: [50, 205, 50],
	linen: [250, 240, 230],
	magenta: [255, 0, 255],
	maroon: [128, 0, 0],
	mediumaquamarine: [102, 205, 170],
	mediumblue: [0, 0, 205],
	mediumorchid: [186, 85, 211],
	mediumpurple: [147, 112, 219],
	mediumseagreen: [60, 179, 113],
	mediumslateblue: [123, 104, 238],
	mediumspringgreen: [0, 250, 154],
	mediumturquoise: [72, 209, 204],
	mediumvioletred: [199, 21, 133],
	midnightblue: [25, 25, 112],
	mintcream: [245, 255, 250],
	mistyrose: [255, 228, 225],
	moccasin: [255, 228, 181],
	navajowhite: [255, 222, 173],
	navy: [0, 0, 128],
	oldlace: [253, 245, 230],
	olive: [128, 128, 0],
	olivedrab: [107, 142, 35],
	orange: [255, 165, 0],
	orangered: [255, 69, 0],
	orchid: [218, 112, 214],
	palegoldenrod: [238, 232, 170],
	palegreen: [152, 251, 152],
	paleturquoise: [175, 238, 238],
	palevioletred: [219, 112, 147],
	papayawhip: [255, 239, 213],
	peachpuff: [255, 218, 185],
	peru: [205, 133, 63],
	pink: [255, 192, 203],
	plum: [221, 160, 221],
	powderblue: [176, 224, 230],
	purple: [128, 0, 128],
	rebeccapurple: [102, 51, 153],
	red: [255, 0, 0],
	rosybrown: [188, 143, 143],
	royalblue: [65, 105, 225],
	saddlebrown: [139, 69, 19],
	salmon: [250, 128, 114],
	sandybrown: [244, 164, 96],
	seagreen: [46, 139, 87],
	seashell: [255, 245, 238],
	sienna: [160, 82, 45],
	silver: [192, 192, 192],
	skyblue: [135, 206, 235],
	slateblue: [106, 90, 205],
	slategray: [112, 128, 144],
	slategrey: [112, 128, 144],
	snow: [255, 250, 250],
	springgreen: [0, 255, 127],
	steelblue: [70, 130, 180],
	tan: [210, 180, 140],
	teal: [0, 128, 128],
	thistle: [216, 191, 216],
	tomato: [255, 99, 71],
	turquoise: [64, 224, 208],
	violet: [238, 130, 238],
	wheat: [245, 222, 179],
	white: [255, 255, 255],
	whitesmoke: [245, 245, 245],
	yellow: [255, 255, 0],
	yellowgreen: [154, 205, 50],
};

// Add aliases with spaces
namedColors["alice blue"] = namedColors.aliceblue!;
namedColors["antique white"] = namedColors.antiquewhite!;
namedColors["aqua marine"] = namedColors.aquamarine!;
namedColors["blanched almond"] = namedColors.blanchedalmond!;
namedColors["blue violet"] = namedColors.blueviolet!;
namedColors["burly wood"] = namedColors.burlywood!;
namedColors["cadet blue"] = namedColors.cadetblue!;
namedColors["cornflower blue"] = namedColors.cornflowerblue!;
namedColors["corn silk"] = namedColors.cornsilk!;
namedColors["dark blue"] = namedColors.darkblue!;
namedColors["dark cyan"] = namedColors.darkcyan!;
namedColors["dark goldenrod"] = namedColors.darkgoldenrod!;
namedColors["dark gray"] = namedColors.darkgray!;
namedColors["dark green"] = namedColors.darkgreen!;
namedColors["dark grey"] = namedColors.darkgrey!;
namedColors["dark khaki"] = namedColors.darkkhaki!;
namedColors["dark magenta"] = namedColors.darkmagenta!;
namedColors["dark olive green"] = namedColors.darkolivegreen!;
namedColors["dark orange"] = namedColors.darkorange!;
namedColors["dark orchid"] = namedColors.darkorchid!;
namedColors["dark red"] = namedColors.darkred!;
namedColors["dark salmon"] = namedColors.darksalmon!;
namedColors["dark sea green"] = namedColors.darkseagreen!;
namedColors["dark slate blue"] = namedColors.darkslateblue!;
namedColors["dark slate gray"] = namedColors.darkslategray!;
namedColors["dark slate grey"] = namedColors.darkslategrey!;
namedColors["dark turquoise"] = namedColors.darkturquoise!;
namedColors["dark violet"] = namedColors.darkviolet!;
namedColors["deep pink"] = namedColors.deeppink!;
namedColors["deep sky blue"] = namedColors.deepskyblue!;
namedColors["dim gray"] = namedColors.dimgray!;
namedColors["dim grey"] = namedColors.dimgrey!;
namedColors["dodger blue"] = namedColors.dodgerblue!;
namedColors["fire brick"] = namedColors.firebrick!;
namedColors["floral white"] = namedColors.floralwhite!;
namedColors["forest green"] = namedColors.forestgreen!;
namedColors["ghost white"] = namedColors.ghostwhite!;
namedColors["golden rod"] = namedColors.goldenrod!;
namedColors["green yellow"] = namedColors.greenyellow!;
namedColors["honey dew"] = namedColors.honeydew!;
namedColors["hot pink"] = namedColors.hotpink!;
namedColors["indian red"] = namedColors.indianred!;
namedColors["lavender blush"] = namedColors.lavenderblush!;
namedColors["lawn green"] = namedColors.lawngreen!;
namedColors["lemon chiffon"] = namedColors.lemonchiffon!;
namedColors["light blue"] = namedColors.lightblue!;
namedColors["light coral"] = namedColors.lightcoral!;
namedColors["light cyan"] = namedColors.lightcyan!;
namedColors["light goldenrod yellow"] = namedColors.lightgoldenrodyellow!;
namedColors["light gray"] = namedColors.lightgray!;
namedColors["light green"] = namedColors.lightgreen!;
namedColors["light grey"] = namedColors.lightgrey!;
namedColors["light pink"] = namedColors.lightpink!;
namedColors["light salmon"] = namedColors.lightsalmon!;
namedColors["light sea green"] = namedColors.lightseagreen!;
namedColors["light sky blue"] = namedColors.lightskyblue!;
namedColors["light slate gray"] = namedColors.lightslategray!;
namedColors["light slate grey"] = namedColors.lightslategrey!;
namedColors["light steel blue"] = namedColors.lightsteelblue!;
namedColors["light yellow"] = namedColors.lightyellow!;
namedColors["lime green"] = namedColors.limegreen!;
namedColors["medium aqua marine"] = namedColors.mediumaquamarine!;
namedColors["medium aquamarine"] = namedColors.mediumaquamarine!;
namedColors["medium blue"] = namedColors.mediumblue!;
namedColors["medium orchid"] = namedColors.mediumorchid!;
namedColors["medium purple"] = namedColors.mediumpurple!;
namedColors["medium sea green"] = namedColors.mediumseagreen!;
namedColors["medium slate blue"] = namedColors.mediumslateblue!;
namedColors["medium spring green"] = namedColors.mediumspringgreen!;
namedColors["medium turquoise"] = namedColors.mediumturquoise!;
namedColors["medium violet red"] = namedColors.mediumvioletred!;
namedColors["midnight blue"] = namedColors.midnightblue!;
namedColors["mint cream"] = namedColors.mintcream!;
namedColors["misty rose"] = namedColors.mistyrose!;
namedColors["navajo white"] = namedColors.navajowhite!;
namedColors["old lace"] = namedColors.oldlace!;
namedColors["olive drab"] = namedColors.olivedrab!;
namedColors["orange red"] = namedColors.orangered!;
namedColors["pale goldenrod"] = namedColors.palegoldenrod!;
namedColors["pale green"] = namedColors.palegreen!;
namedColors["pale turquoise"] = namedColors.paleturquoise!;
namedColors["pale violet red"] = namedColors.palevioletred!;
namedColors["papaya whip"] = namedColors.papayawhip!;
namedColors["peach puff"] = namedColors.peachpuff!;
namedColors["powder blue"] = namedColors.powderblue!;
namedColors["rebecca purple"] = namedColors.rebeccapurple!;
namedColors["rosy brown"] = namedColors.rosybrown!;
namedColors["royal blue"] = namedColors.royalblue!;
namedColors["saddle brown"] = namedColors.saddlebrown!;
namedColors["sandy brown"] = namedColors.sandybrown!;
namedColors["sea green"] = namedColors.seagreen!;
namedColors["sea shell"] = namedColors.seashell!;
namedColors["sky blue"] = namedColors.skyblue!;
namedColors["slate blue"] = namedColors.slateblue!;
namedColors["slate gray"] = namedColors.slategray!;
namedColors["slate grey"] = namedColors.slategrey!;
namedColors["spring green"] = namedColors.springgreen!;
namedColors["steel blue"] = namedColors.steelblue!;
namedColors["white smoke"] = namedColors.whitesmoke!;
namedColors["yellow green"] = namedColors.yellowgreen!;
//#endregion

export const resolveColor = (color: string): RGB => {
	color = color.toLowerCase().trim();
	if (color in namedColors) return namedColors[color]!;
	// eslint-disable-next-line @typescript-eslint/prefer-string-starts-ends-with
	if (color[0] === "#") {
		color = color.slice(1);
		if (color.length === 3)
			return [
				parseInt(color[0]! + color[0]!, 16),
				parseInt(color[1]! + color[1]!, 16),
				parseInt(color[2]! + color[2]!, 16),
			];
		if (color.length === 6)
			return [
				parseInt(color[0]! + color[1]!, 16),
				parseInt(color[2]! + color[3]!, 16),
				parseInt(color[4]! + color[5]!, 16),
			];
		throw new Error("Invalid hex color");
	}
	if (color.startsWith("rgb(")) {
		color = color.slice(4, -1).trim();
		const rgb = (
			color.includes(",") ? color.split(",") : color.split(/\s+/)
		).map((c) => {
			c = c.trim();
			return Math.max(
				Math.min(
					c.endsWith("%")
						? Math.floor((parseFloat(c) / 100) * 255 + 0.5)
						: parseInt(c, 10),
					255,
				),
				0,
			);
		});
		if (rgb.length !== 3 || rgb.some(isNaN))
			throw new Error("Invalid RGB color");
		return rgb as RGB;
	}
	if (color.startsWith("hsl(")) {
		color = color.slice(4, -1).trim();
		const hsl = (
			color.includes(",") ? color.split(",") : color.split(/\s+/)
		).map((c) => c.trim());
		if (hsl.length !== 3) throw new Error("Invalid HSL color");
		const h = ((parseFloat(hsl[0]!) % 360) + 360) % 360; // Normalize to [0, 360)
		const s = Math.max(Math.min(parseFloat(hsl[1]!), 100), 0);
		const l = Math.max(Math.min(parseFloat(hsl[2]!), 100), 0);
		if (isNaN(h) || isNaN(s) || isNaN(l)) throw new Error("Invalid HSL color");
		return hslToRgb(h, s, l);
	}
	if (color.startsWith("hwb(")) {
		color = color.slice(4, -1).trim();
		const hwb = (
			color.includes(",") ? color.split(",") : color.split(/\s+/)
		).map((c) => c.trim());
		if (hwb.length !== 3) throw new Error("Invalid HWB color");
		const h = ((parseFloat(hwb[0]!) % 360) + 360) % 360; // Normalize to [0, 360)
		const w = Math.max(Math.min(parseFloat(hwb[1]!), 100), 0);
		const b = Math.max(Math.min(parseFloat(hwb[2]!), 100), 0);
		if (isNaN(h) || isNaN(w) || isNaN(b)) throw new Error("Invalid HWB color");
		return hwbToRgb(h, w, b);
	}
	throw new Error("Invalid color");
};
