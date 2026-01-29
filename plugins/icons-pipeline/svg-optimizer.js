import { optimize } from 'svgo';
import bbox from 'svg-path-bounding-box';
import { XMLParser } from 'fast-xml-parser';

// Парсим svg через fast-xml-parser, чтобы вытащить path и посчитать bbox
const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '',
});

// Оптимизируем исходный svg и пересчитываем viewBox по фактическому bbox path'ов
export function optimizeSvg(input, padding = 0) {
	const optimized = optimize(input, {
		plugins: ['preset-default', 'removeDimensions'],
	}).data;

	const svg = parser.parse(optimized).svg;
	if (!svg) return null;

	// Нормализуем svg.path к массиву путей
	const paths = Array.isArray(svg.path) ? svg.path : svg.path ? [svg.path] : [];
	if (!paths.length) return null;

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	// Считаем объединённый bbox по всем path'ам
	for (const p of paths) {
		const b = bbox(p.d);
		minX = Math.min(minX, b.minX);
		minY = Math.min(minY, b.minY);
		maxX = Math.max(maxX, b.maxX);
		maxY = Math.max(maxY, b.maxY);
	}

	// Добавляем отступы, если нужно
	minX -= padding;
	minY -= padding;
	maxX += padding;
	maxY += padding;

	const width = maxX - minX;
	const height = maxY - minY;

	const output = `<svg viewBox="${minX} ${minY} ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
${paths.map((p) => `  <path d="${p.d}" />`).join('\n')}
</svg>`;

	return { svg: output.trim(), viewBox: `${minX} ${minY} ${width} ${height}` };
}
