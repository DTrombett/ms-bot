// PNG signature
const signature = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
// Precompute CRC table once
const crcTable: number[] = [];

for (let i = 0; i < 256; i++) {
	let c = i;

	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	crcTable[i] = c >>> 0;
}

const crc32 = (bufs: Uint8Array[]) => {
	let crc = 0xffffffff;

	for (const b of bufs)
		for (const byte of b) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
	return (crc ^ 0xffffffff) >>> 0;
};

// Helper: write a PNG chunk
const pngChunk = (type: string, data: Uint8Array) => {
	const typeBuf = new TextEncoder().encode(type);
	const lenBuf = new Uint8Array(4);
	const crcBuf = new Uint8Array(4);
	let offset =
		lenBuf.byteLength +
		typeBuf.byteLength +
		data.byteLength +
		crcBuf.byteLength;
	const out = new Uint8Array(offset);

	new DataView(lenBuf.buffer).setUint32(0, data.byteLength, false);
	new DataView(crcBuf.buffer).setUint32(0, crc32([typeBuf, data]) >>> 0, false);
	out.set(crcBuf, (offset -= crcBuf.byteLength));
	out.set(data, (offset -= data.byteLength));
	out.set(typeBuf, (offset -= typeBuf.byteLength));
	out.set(lenBuf, (offset -= lenBuf.byteLength));
	return out;
};

/**
 * Create a solid-color PNG buffer
 * @param width  Image width
 * @param height Image height
 * @param r Red   (0-255)
 * @param g Green (0-255)
 * @param b Blue  (0-255)
 * @returns PNG data
 */
export const createSolidPng = async (
	width: number,
	height: number,
	r: number,
	g: number,
	b: number,
): Promise<Uint8Array> => {
	// IHDR chunk
	const ihdr = new Uint8Array(13);
	const view = new DataView(ihdr.buffer);
	// Raw pixel data (each row starts with a filter byte = 0)
	const rowSize = width * 3 + 1; // 3 bytes per pixel + filter byte
	const row = new Uint8Array(rowSize);
	// Compression stream
	const cs = new CompressionStream("deflate");
	const writer = cs.writable.getWriter();

	view.setUint32(0, width, false); // width (big-endian)
	view.setUint32(4, height, false); // height (big-endian)
	ihdr[8] = 8; // bit depth
	ihdr[9] = 2; // color type: RGB
	ihdr[10] = 0; // compression
	ihdr[11] = 0; // filter
	ihdr[12] = 0; // interlace
	row[0] = 0; // filter type 0
	for (let o = 1, x = 0; x < width; x++) {
		row[o++] = r;
		row[o++] = g;
		row[o++] = b;
	}
	for (let y = 0; y < height; y++) void writer.write(row);
	void writer.close();
	const ihdrChunk = pngChunk("IHDR", ihdr);
	const idatChunk = pngChunk(
		"IDAT",
		new Uint8Array(await new Response(cs.readable).arrayBuffer()),
	);
	const iendChunk = pngChunk("IEND", new Uint8Array(0));
	let offset =
		signature.length + ihdrChunk.length + idatChunk.length + iendChunk.length;
	const out = new Uint8Array(offset);
	out.set(iendChunk, (offset -= iendChunk.length));
	out.set(idatChunk, (offset -= idatChunk.length));
	out.set(ihdrChunk, (offset -= ihdrChunk.length));
	out.set(signature, (offset -= signature.length));
	return out;
};
