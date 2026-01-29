import fs from 'node:fs';
import path from 'node:path';
import { optimizeSvg } from './svg-optimizer.js';
import { buildSprite } from './sprite-builder.js';
import { generateCatalog } from './html-catalog.js';

// Единая точка входа пайплайна обработки иконок
// Читает svg из rawDir, делит на critical/rest, строит спрайты и dev-каталог
export async function runPipeline(config) {
	const { rawDir, outDir, catalogDir, rules, logger } = config;

	// Если директории с исходниками нет — просто предупреждаем и выходим
	if (!fs.existsSync(rawDir)) {
		logger?.warn(`Icons source directory not found: ${rawDir}`);
		return;
	}

	// Берем только svg-файлы из сырой директории
	const files = fs.readdirSync(rawDir).filter((f) => f.endsWith('.svg'));
	if (!files.length) {
		logger?.warn('No SVG files found');
		return;
	}

	// Список имён критичных иконок (остальные пойдут в rest)
	const criticalNames = new Set(rules.critical || []);
	const criticalIcons = [];
	const restIcons = [];

	// Пробегаемся по всем svg и оптимизируем каждую
	for (const file of files) {
		const name = path.basename(file, '.svg');
		const input = fs.readFileSync(path.join(rawDir, file), 'utf8');

		const result = optimizeSvg(input, 0);
		if (!result) {
			logger?.warn(`Failed to optimize: ${file}`);
			continue;
		}

		const icon = { name, svg: result.svg, viewBox: result.viewBox };

		if (criticalNames.has(name)) {
			criticalIcons.push(icon);
		} else {
			restIcons.push(icon);
		}
	}

	// Гарантируем, что директория для спрайтов существует
	fs.mkdirSync(outDir, { recursive: true });

	// Строим два спрайта: critical (hero-*) и остальные (icon-*)
	const criticalSprite = buildSprite(criticalIcons, 'hero-');
	const restSprite = buildSprite(restIcons, 'icon-');

	fs.writeFileSync(path.join(outDir, 'critical-sprite.svg'), criticalSprite);
	fs.writeFileSync(path.join(outDir, 'rest-sprite.svg'), restSprite);

	// Собираем dev‑страницу каталога иконок
	if (catalogDir) {
		const catalogHtml = generateCatalog(criticalIcons, restIcons);
		const catalogPath = path.join(catalogDir, 'icons.html');
		fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
		fs.writeFileSync(catalogPath, catalogHtml);
	}

	logger?.info(`Icons processed: ${criticalIcons.length} critical, ${restIcons.length} rest`);
}
