import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { optimizeSvg } from './svg-optimizer.js';
import { buildSprite } from './sprite-builder.js';
import { generateCatalog } from './html-catalog.js';
import { validatePath } from './path-utils.js';

// Единая точка входа пайплайна обработки иконок
// Читает svg из rawDir, делит на critical/rest, строит спрайты и dev-каталог
export async function runPipeline(config) {
	const { rawDir, outDir, catalogDir, rules, logger } = config;

	if (!existsSync(rawDir)) {
		logger?.warn(`Icons source directory not found: ${rawDir}`);
		return;
	}

	const allFiles = await fs.readdir(rawDir);
	const files = allFiles.filter((f) => f.endsWith('.svg'));
	if (!files.length) {
		logger?.warn('No SVG files found');
		return;
	}

	const criticalNames = new Set(rules.critical || []);
	const foundNames = new Set();
	const criticalIcons = [];
	const restIcons = [];

	const contents = await Promise.all(
		files.map(async (file) => {
			const content = await fs.readFile(path.join(rawDir, file), 'utf8');
			return { file, content };
		})
	);

	for (const { file, content } of contents) {
		const name = path.basename(file, '.svg');
		foundNames.add(name);

		const result = optimizeSvg(content, 0);
		if (!result) {
			logger?.warn(`Skipped (not a simple path icon): ${file}`);
			continue;
		}

		const icon = { name, svg: result.svg, viewBox: result.viewBox };

		if (criticalNames.has(name)) {
			criticalIcons.push(icon);
		} else {
			restIcons.push(icon);
		}
	}

	for (const name of criticalNames) {
		if (!foundNames.has(name)) {
			logger?.warn(`Critical icon not found: ${name}`);
		}
	}

	await fs.mkdir(outDir, { recursive: true });

	const criticalSpritePath = path.join(outDir, 'critical-sprite.svg');
	const restSpritePath = path.join(outDir, 'rest-sprite.svg');

	validatePath(criticalSpritePath);
	validatePath(restSpritePath);

	if (criticalIcons.length) {
		await fs.writeFile(criticalSpritePath, buildSprite(criticalIcons));
	} else if (existsSync(criticalSpritePath)) {
		await fs.unlink(criticalSpritePath);
	}

	if (restIcons.length) {
		await fs.writeFile(restSpritePath, buildSprite(restIcons));
	} else if (existsSync(restSpritePath)) {
		await fs.unlink(restSpritePath);
	}

	if (catalogDir) {
		const catalogPath = path.join(catalogDir, 'icons.html');
		validatePath(catalogPath);
		await fs.mkdir(path.dirname(catalogPath), { recursive: true });
		await fs.writeFile(catalogPath, generateCatalog(criticalIcons, restIcons));
	}

	logger?.info(`Icons processed: ${criticalIcons.length} critical, ${restIcons.length} rest`);
}
