import capitalize from "./capitalize";
import { randomArrayItem } from "./random";

export type RGB = [red: number, green: number, blue: number];
export type HSL = [hue: number, sat: number, light: number];
export type HWB = [hue: number, white: number, black: number];
export type HSV = [hue: number, sat: number, value: number];
export type CMYK = [cyan: number, magenta: number, yellow: number, key: number];
export type Color = {
	rgb: RGB;
	hex: string;
	hsl: HSL;
	hwb: HWB;
	hsv: HSV;
	cmyk: CMYK;
	name: string | null;
};

const epsilon = 1 / 100_000;

export const cssRound = (x: number) => Math.floor(x + 0.5);

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

		return cssRound(
			(light -
				sat *
					Math.min(light, 1 - light) *
					Math.max(-1, Math.min(k - 3, 9 - k, 1))) *
				255,
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
export const rgbToHsl = (red: number, green: number, blue: number): HSL => {
	red /= 255;
	green /= 255;
	blue /= 255;
	const max = Math.max(red, green, blue);
	const min = Math.min(red, green, blue);
	// eslint-disable-next-line prefer-const
	let [hue, sat, light] = [0, 0, (min + max) / 2];
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
	if (sat <= epsilon) hue = 0;
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
		const gray = cssRound((white / (white + black)) * 255);

		return [gray, gray, gray];
	}
	const rgb = hslToRgb(hue, 100, 50);
	for (let i = 0; i < 3; i++) {
		rgb[i]! /= 255;
		rgb[i]! *= 1 - white - black;
		rgb[i]! += white;
		rgb[i] = cssRound(rgb[i]! * 255);
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
	let hue = 0;
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
export const rgbToHwb = (red: number, green: number, blue: number): HWB => {
	red /= 255;
	green /= 255;
	blue /= 255;
	const white = Math.min(red, green, blue);
	const black = 1 - Math.max(red, green, blue);
	let hue = rgbToHue(red, green, blue);

	if (white + black >= 1 - epsilon) hue = 0;
	return [hue, white * 100, black * 100];
};

export const rgbToHex = (...rgb: RGB): string =>
	`#${rgb
		.map((c) => c.toString(16).padStart(2, "0"))
		.join("")
		.toUpperCase()}`;

export const rgbToCmyk = (r: number, g: number, b: number): CMYK => {
	r /= 255;
	g /= 255;
	b /= 255;
	const k = 1 - Math.max(r, g, b);
	if (k === 1) return [0, 0, 0, 1];
	return [
		((1 - k - r) / (1 - k)) * 100,
		((1 - k - g) / (1 - k)) * 100,
		((1 - k - b) / (1 - k)) * 100,
		k * 100,
	];
};

export const rgbToHsv = (r: number, g: number, b: number): HSV => {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const delta = max - Math.min(r, g, b);
	let h = 0;
	if (delta !== 0) {
		if (max === r) h = ((g - b) / delta) % 6;
		else if (max === g) h = (b - r) / delta + 2;
		else h = (r - g) / delta + 4;
		h *= 60;
		if (h < 0) h += 360;
	}
	return [h, (max && delta / max) * 100, max * 100];
};

//#region Named colors
export const namedColors: Record<string, RGB> = {
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
export const aliases: Record<string, string> = {
	"alice blue": "aliceblue",
	"antique white": "antiquewhite",
	"aqua marine": "aquamarine",
	"blanched almond": "blanchedalmond",
	"blue violet": "blueviolet",
	"burly wood": "burlywood",
	"cadet blue": "cadetblue",
	"cornflower blue": "cornflowerblue",
	"corn silk": "cornsilk",
	"dark blue": "darkblue",
	"dark cyan": "darkcyan",
	"dark goldenrod": "darkgoldenrod",
	"dark gray": "darkgray",
	"dark green": "darkgreen",
	"dark grey": "darkgrey",
	"dark khaki": "darkkhaki",
	"dark magenta": "darkmagenta",
	"dark olive green": "darkolivegreen",
	"dark orange": "darkorange",
	"dark orchid": "darkorchid",
	"dark red": "darkred",
	"dark salmon": "darksalmon",
	"dark sea green": "darkseagreen",
	"dark slate blue": "darkslateblue",
	"dark slate gray": "darkslategray",
	"dark slate grey": "darkslategrey",
	"dark turquoise": "darkturquoise",
	"dark violet": "darkviolet",
	"deep pink": "deeppink",
	"deep sky blue": "deepskyblue",
	"dim gray": "dimgray",
	"dim grey": "dimgrey",
	"dodger blue": "dodgerblue",
	"fire brick": "firebrick",
	"floral white": "floralwhite",
	"forest green": "forestgreen",
	"ghost white": "ghostwhite",
	"golden rod": "goldenrod",
	"green yellow": "greenyellow",
	"honey dew": "honeydew",
	"hot pink": "hotpink",
	"indian red": "indianred",
	"lavender blush": "lavenderblush",
	"lawn green": "lawngreen",
	"lemon chiffon": "lemonchiffon",
	"light blue": "lightblue",
	"light coral": "lightcoral",
	"light cyan": "lightcyan",
	"light goldenrod yellow": "lightgoldenrodyellow",
	"light gray": "lightgray",
	"light green": "lightgreen",
	"light grey": "lightgrey",
	"light pink": "lightpink",
	"light salmon": "lightsalmon",
	"light sea green": "lightseagreen",
	"light sky blue": "lightskyblue",
	"light slate gray": "lightslategray",
	"light slate grey": "lightslategrey",
	"light steel blue": "lightsteelblue",
	"light yellow": "lightyellow",
	"lime green": "limegreen",
	"medium aqua marine": "mediumaquamarine",
	"medium aquamarine": "mediumaquamarine",
	"medium blue": "mediumblue",
	"medium orchid": "mediumorchid",
	"medium purple": "mediumpurple",
	"medium sea green": "mediumseagreen",
	"medium slate blue": "mediumslateblue",
	"medium spring green": "mediumspringgreen",
	"medium turquoise": "mediumturquoise",
	"medium violet red": "mediumvioletred",
	"midnight blue": "midnightblue",
	"mint cream": "mintcream",
	"misty rose": "mistyrose",
	"navajo white": "navajowhite",
	"old lace": "oldlace",
	"olive drab": "olivedrab",
	"orange red": "orangered",
	"pale goldenrod": "palegoldenrod",
	"pale green": "palegreen",
	"pale turquoise": "paleturquoise",
	"pale violet red": "palevioletred",
	"papaya whip": "papayawhip",
	"peach puff": "peachpuff",
	"powder blue": "powderblue",
	"rebecca purple": "rebeccapurple",
	"rosy brown": "rosybrown",
	"royal blue": "royalblue",
	"saddle brown": "saddlebrown",
	"sandy brown": "sandybrown",
	"sea green": "seagreen",
	"sea shell": "seashell",
	"sky blue": "skyblue",
	"slate blue": "slateblue",
	"slate gray": "slategray",
	"slate grey": "slategrey",
	"spring green": "springgreen",
	"steel blue": "steelblue",
	"white smoke": "whitesmoke",
	"yellow green": "yellowgreen",
};
//#endregion

export const findColorName = (rgb: RGB): string | null => {
	let minDist = Infinity;
	let name!: string;

	for (const key in namedColors) {
		const dist = namedColors[key]!.reduce(
			(sum, value, index) => sum + (rgb[index]! - value) ** 2,
			0,
		);

		if (dist < minDist) {
			minDist = dist;
			name = key;
		}
	}
	if (minDist > 4096) return null;
	return (Object.keys(aliases).find((key) => aliases[key] === name) ?? name)
		.split(" ")
		.map(capitalize)
		.join(" ");
};

export const resolveColor = (color: string): Color => {
	color = color.toLowerCase().trim();
	if (color === "random") color = randomArrayItem(Object.keys(namedColors));
	else if (color in aliases) color = aliases[color]!;
	if (color in namedColors)
		return {
			name: (
				Object.keys(aliases).find((key) => aliases[key] === color) ?? color
			)
				.split(" ")
				.map(capitalize)
				.join(" "),
			rgb: namedColors[color]!,
			hex: rgbToHex(...namedColors[color]!),
			hsl: rgbToHsl(...namedColors[color]!),
			hwb: rgbToHwb(...namedColors[color]!),
			hsv: rgbToHsv(...namedColors[color]!),
			cmyk: rgbToCmyk(...namedColors[color]!),
		};
	if (color[0] === "#") {
		color = color.slice(1);
		let rgb: RGB;
		if (color.length === 3)
			rgb = [
				parseInt(color[0]! + color[0]!, 16),
				parseInt(color[1]! + color[1]!, 16),
				parseInt(color[2]! + color[2]!, 16),
			];
		else if (color.length === 6)
			rgb = [
				parseInt(color[0]! + color[1]!, 16),
				parseInt(color[2]! + color[3]!, 16),
				parseInt(color[4]! + color[5]!, 16),
			];
		else throw new Error("Invalid hex color");
		return {
			rgb,
			hex: rgbToHex(...rgb),
			hsl: rgbToHsl(...rgb),
			hwb: rgbToHwb(...rgb),
			cmyk: rgbToCmyk(...rgb),
			hsv: rgbToHsv(...rgb),
			name: findColorName(rgb),
		};
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
						? cssRound((parseFloat(c) / 100) * 255)
						: parseInt(c, 10),
					255,
				),
				0,
			);
		}) as RGB;
		if ((rgb.length as number) !== 3 || rgb.some(isNaN))
			throw new Error("Invalid RGB color");
		return {
			rgb,
			hex: rgbToHex(...rgb),
			hsl: rgbToHsl(...rgb),
			hwb: rgbToHwb(...rgb),
			cmyk: rgbToCmyk(...rgb),
			hsv: rgbToHsv(...rgb),
			name: findColorName(rgb),
		};
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
		const rgb = hslToRgb(h, s, l);
		return {
			rgb,
			hsl: [h, s, l],
			hex: rgbToHex(...rgb),
			hwb: rgbToHwb(...rgb),
			cmyk: rgbToCmyk(...rgb),
			hsv: rgbToHsv(...rgb),
			name: findColorName(rgb),
		};
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
		const rgb = hwbToRgb(h, w, b);
		return {
			rgb,
			hwb: [h, w, b],
			hsl: rgbToHsl(...rgb),
			hex: rgbToHex(...rgb),
			cmyk: rgbToCmyk(...rgb),
			hsv: rgbToHsv(...rgb),
			name: findColorName(rgb),
		};
	}
	throw new Error("Invalid color");
};
