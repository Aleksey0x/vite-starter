// Строим единый SVG‑спрайт из массива иконок
// icons: [{ name, svg, viewBox }], symbolPrefix: 'hero-' | 'icon-'
export function buildSprite(icons, symbolPrefix) {
	if (!icons.length) {
		return '<svg xmlns="http://www.w3.org/2000/svg" style="display:none"></svg>';
	}

	// Каждую иконку заворачиваем в <symbol id="prefix-name">
	const symbols = icons
		.map(({ name, svg, viewBox }) => {
			const content = svg
				.replace(/<svg[^>]*>/i, '')
				.replace(/<\/svg>/i, '')
				.trim();

			return `<symbol id="${symbolPrefix}${name}" viewBox="${viewBox}">${content}</symbol>`;
		})
		.join('');

	return `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${symbols}</svg>`;
}
