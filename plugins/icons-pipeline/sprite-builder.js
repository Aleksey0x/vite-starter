// Строим SVG-спрайт из массива иконок
// icons: [{ name, svg, viewBox }]
export function buildSprite(icons) {
	if (!icons.length) {
		return '<svg xmlns="http://www.w3.org/2000/svg" style="display:none"></svg>';
	}

	const symbols = icons
		.map(({ name, svg, viewBox }) => {
			const content = svg
				.replace(/<svg[\s\S]*?>/i, '')
				.replace(/<\/svg\s*>/i, '')
				.trim();

			return `<symbol id="${name}" viewBox="${viewBox}">${content}</symbol>`;
		})
		.join('');

	return `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${symbols}</svg>`;
}
