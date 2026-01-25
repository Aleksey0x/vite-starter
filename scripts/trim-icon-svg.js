import fs from 'fs';
import path from 'path';
import { optimize } from 'svgo';
import bbox from 'svg-path-bounding-box';
import { XMLParser } from 'fast-xml-parser';

const SRC = 'src/raw/icons';
const OUT = 'src/assets/icons/optimized';
const PADDING = 0; // можно поставить 1–2 если нужно

fs.mkdirSync(OUT, { recursive: true });

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '',
});

for (const file of fs.readdirSync(SRC)) {
	if (!file.endsWith('.svg')) continue;

	const input = fs.readFileSync(path.join(SRC, file), 'utf8');

	// 1. ЖЁСТКАЯ чистка SVGO
	const optimized = optimize(input, {
		plugins: [
			{
				name: 'preset-default',
				params: {
					overrides: {
						removeViewBox: false,
						removeTitle: true,
						removeDesc: true,
						removeMetadata: true,
					},
				},
			},
			'removeDimensions',
			'removeComments',
			'removeStyleElement',
			'removeScriptElement',
			'removeAttrs',
		],
	}).data;

	// 2. Парсим SVG
	const svg = parser.parse(optimized).svg;
	if (!svg) continue;

	const paths = Array.isArray(svg.path) ? svg.path : [svg.path];
	if (!paths?.length) continue;

	// 3. bbox по всем path
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;

	for (const p of paths) {
		const b = bbox(p.d);
		minX = Math.min(minX, b.minX);
		minY = Math.min(minY, b.minY);
		maxX = Math.max(maxX, b.maxX);
		maxY = Math.max(maxY, b.maxY);
	}

	minX -= PADDING;
	minY -= PADDING;
	maxX += PADDING;
	maxY += PADDING;

	const width = maxX - minX;
	const height = maxY - minY;

	// 4. Пересобираем SVG С НУЛЯ
	const output = `
<svg viewBox="${minX} ${minY} ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
${paths.map((p) => `  <path d="${p.d}" />`).join('\n')}
</svg>
`.trim();

	fs.writeFileSync(path.join(OUT, file), output);
}
