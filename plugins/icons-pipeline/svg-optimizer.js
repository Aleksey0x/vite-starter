import { optimize } from 'svgo';
import bbox from 'svg-path-bounding-box';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '',
});

// Атрибуты path, которые нужно сохранить
const PATH_ATTRS = ['fill', 'stroke', 'stroke-width', 'fill-rule', 'clip-rule', 'opacity', 'fill-opacity', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin'];

function buildPathAttrs(pathObj) {
	const attrs = [`d="${pathObj.d}"`];
	for (const attr of PATH_ATTRS) {
		if (pathObj[attr] !== undefined) {
			attrs.push(`${attr}="${pathObj[attr]}"`);
		}
	}
	return attrs.join(' ');
}

// Оптимизирует простые SVG (только path элементы)
// Возвращает null для сложных SVG (circle, rect, defs, градиенты)
export function optimizeSvg(input, padding = 0) {
	let optimized;
	try {
		optimized = optimize(input, {
			plugins: ['preset-default', 'removeDimensions'],
		}).data;
	} catch {
		return null;
	}

	const parsed = parser.parse(optimized);
	const svg = parsed?.svg;
	if (!svg) return null;

	// Только простые SVG с path
	const paths = Array.isArray(svg.path) ? svg.path : svg.path ? [svg.path] : [];
	if (!paths.length) return null;

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (const p of paths) {
		if (!p.d) continue;
		try {
			const b = bbox(p.d);
			minX = Math.min(minX, b.minX);
			minY = Math.min(minY, b.minY);
			maxX = Math.max(maxX, b.maxX);
			maxY = Math.max(maxY, b.maxY);
		} catch {
			return null;
		}
	}

	if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
		return null;
	}

	minX -= padding;
	minY -= padding;
	maxX += padding;
	maxY += padding;

	const width = maxX - minX;
	const height = maxY - minY;
	const viewBox = `${minX} ${minY} ${width} ${height}`;

	const output = `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
${paths.map((p) => `  <path ${buildPathAttrs(p)} />`).join('\n')}
</svg>`;

	return { svg: output.trim(), viewBox };
}
