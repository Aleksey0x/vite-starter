// Экранируем спецсимволы, чтобы код иконки корректно отображался в <code>
function escapeHtml(value) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

// Собираем HTML-страницу каталога иконок для dev-страницы
// criticalIcons / restIcons — массивы объектов { name, svg }
export function generateCatalog(criticalIcons, restIcons) {
	const sections = [];

	// Блок с критичными иконками
	if (criticalIcons.length) {
		const grid = criticalIcons
			.map(({ name, svg }) => {
				const snippet = [
					'<svg class="icon" aria-hidden="true" focusable="false">',
					`  <use href="#${name}"></use>`,
					'</svg>',
				].join('\n');
				const code = escapeHtml(snippet);
				return `
				<div class="item">
					<div class="preview">${svg}</div>
					<div class="name">${name}</div>
					<pre class="code"><code>${code}</code></pre>
				</div>`;
			})
			.join('');

		sections.push(`
		<section>
			<h2>critical</h2>
			<div class="grid">${grid}
			</div>
		</section>`);
	}

	// Блок с остальными иконками
	if (restIcons.length) {
		const grid = restIcons
			.map(({ name, svg }) => {
				const snippet = [
					'<svg class="icon" aria-hidden="true" focusable="false">',
					`  <use href="#${name}"></use>`,
					'</svg>',
				].join('\n');
				const code = escapeHtml(snippet);
				return `
				<div class="item">
					<div class="preview">${svg}</div>
					<div class="name">${name}</div>
					<pre class="code"><code>${code}</code></pre>
				</div>`;
			})
			.join('');

		sections.push(`
		<section>
			<h2>rest</h2>
			<div class="grid">${grid}
			</div>
		</section>`);
	}

	// Цельная HTML-страница каталога (используется в src/dev/icons.html)
	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<link rel="stylesheet" href="./icons-html.css">
	<title>Icons</title>
</head>
<body>
${sections.length ? sections.join('\n') : '<p>Иконки не найдены.</p>'}
</body>
</html>`;
}
