import fs from 'node:fs';
import path from 'node:path';
import { runPipeline } from './pipeline.js';

function resolveAlias(aliasPath, config) {
	if (!aliasPath.startsWith('@')) {
		throw new Error(`[icons-pipeline] Path must be an alias starting with '@', got: ${aliasPath}`);
	}

	const aliases = config.resolve?.alias || {};
	const aliasEntries = Array.isArray(aliases) ? aliases : Object.entries(aliases);

	// Сортируем по длине ключа (длинные первыми), чтобы '@icons/raw' матчился раньше '@icons'
	const sortedEntries = aliasEntries
		.map(entry => Array.isArray(entry) ? entry : [entry.find, entry.replacement])
		.sort((a, b) => b[0].length - a[0].length);

	for (const [aliasKey, aliasValue] of sortedEntries) {
		if (aliasPath === aliasKey) {
			return path.isAbsolute(aliasValue) ? aliasValue : path.resolve(process.cwd(), aliasValue);
		}
		if (aliasPath.startsWith(aliasKey + '/')) {
			const rest = aliasPath.slice(aliasKey.length + 1);
			const basePath = path.isAbsolute(aliasValue) ? aliasValue : path.resolve(process.cwd(), aliasValue);
			return path.join(basePath, rest);
		}
	}

	throw new Error(`[icons-pipeline] Alias not found in config.resolve.alias: ${aliasPath}`);
}

// Vite‑плагин, который строит SVG‑спрайты и dev‑каталог иконок
// options:
// - rawDir     — откуда брать исходные svg (alias, например '@icons/raw')
// - outDir     — куда класть спрайты (alias, например '@icons')
// - catalogDir — куда класть dev-каталог (alias, например '@/dev')
// - rules      — правила раскладки (например, список critical)
export function iconsPipelinePlugin(options = {}) {
	const {
		rawDir,
		outDir,
		catalogDir,
		rules = { critical: [] },
	} = options;

	if (!rawDir || !outDir) {
		throw new Error('[icons-pipeline] Both rawDir and outDir are required');
	}

	let resolvedRawDir;
	let resolvedOutDir;
	let resolvedCatalogDir;
	// Флаг, что пайплайн сейчас крутится, чтобы не запускать его параллельно
	let isRunning = false;
	// Если во время работы пришло ещё событие — помечаем, что нужно перезапустить
	let needsRerun = false;

	const logger = {
		info: (msg) => console.log(`[icons-pipeline] ${msg}`),
		warn: (msg) => console.warn(`[icons-pipeline] ${msg}`),
		error: (msg) => console.error(`[icons-pipeline] ${msg}`),
	};

	// Безопасный запуск пайплайна с очередью перезапусков
	async function processPipeline() {
		if (isRunning) {
			needsRerun = true;
			return;
		}

		isRunning = true;

		try {
			await runPipeline({
				rawDir: resolvedRawDir,
				outDir: resolvedOutDir,
				catalogDir: resolvedCatalogDir,
				rules,
				logger,
			});
		} catch (error) {
			logger.error(`Pipeline failed: ${error.message}`);
		} finally {
			isRunning = false;

			if (needsRerun) {
				needsRerun = false;
				processPipeline();
			}
		}
	}

	return {
		name: 'icons-pipeline',

		// После резолва конфига знаем абсолютные пути к сырью и выходу
		configResolved(config) {
			try {
				resolvedRawDir = resolveAlias(rawDir, config);
				resolvedOutDir = resolveAlias(outDir, config);
				if (catalogDir) {
					resolvedCatalogDir = resolveAlias(catalogDir, config);
				}
				logger.info(`rawDir resolved: ${resolvedRawDir}`);
				logger.info(`outDir resolved: ${resolvedOutDir}`);
				if (resolvedCatalogDir) {
					logger.info(`catalogDir resolved: ${resolvedCatalogDir}`);
				}
			} catch (error) {
				throw new Error(`[icons-pipeline] Failed to resolve aliases: ${error.message}`);
			}
		},

		// Один прогон перед prod‑сборкой
		async buildStart() {
			await processPipeline();
		},

		// Интеграция с dev‑сервером: вотчим svg и дергаем пайплайн + full reload
		configureServer(server) {
			const watcher = server.watcher;

			watcher.add(resolvedRawDir);

			watcher.on('add', (file) => {
				if (file.startsWith(resolvedRawDir) && file.endsWith('.svg')) {
					logger.info(`Icon added: ${path.basename(file)}`);
					processPipeline().then(() => {
						server.ws.send({ type: 'full-reload' });
					});
				}
			});

			watcher.on('change', (file) => {
				if (file.startsWith(resolvedRawDir) && file.endsWith('.svg')) {
					logger.info(`Icon changed: ${path.basename(file)}`);
					processPipeline().then(() => {
						server.ws.send({ type: 'full-reload' });
					});
				}
			});

			watcher.on('unlink', (file) => {
				if (file.startsWith(resolvedRawDir) && file.endsWith('.svg')) {
					logger.info(`Icon deleted: ${path.basename(file)}`);
					processPipeline().then(() => {
						server.ws.send({ type: 'full-reload' });
					});
				}
			});
		},

		// Встраиваем critical‑спрайт прямо в <body> index.html
		transformIndexHtml(html) {
			const spritePath = path.join(resolvedOutDir, 'critical-sprite.svg');
			if (!fs.existsSync(spritePath)) return html;

			const sprite = fs.readFileSync(spritePath, 'utf8');
			return html.replace('<body>', `<body>\n${sprite}`);
		},

		generateBundle(options, bundle) {
			const restSpritePath = path.join(resolvedOutDir, 'rest-sprite.svg');
			if (!fs.existsSync(restSpritePath)) return;

			const sprite = fs.readFileSync(restSpritePath, 'utf8');
			this.emitFile({
				type: 'asset',
				fileName: 'assets/icons/rest-sprite.svg',
				source: sprite,
			});
		},
	};
}
