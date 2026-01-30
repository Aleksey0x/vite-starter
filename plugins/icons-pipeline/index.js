import fs from 'node:fs';
import path from 'node:path';
import { runPipeline } from './pipeline.js';

// Нормализация пути для кроссплатформенного сравнения
function normalizePath(p) {
	return path.normalize(p).replace(/\\/g, '/');
}

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
export function iconsPipelinePlugin(options = {}) {
	const {
		rawDir,
		outDir,
		catalogDir,
		rules = { critical: [] },
		debounceMs = 50,
	} = options;

	if (!rawDir || !outDir) {
		throw new Error('[icons-pipeline] Both rawDir and outDir are required');
	}

	let resolvedRawDir;
	let resolvedOutDir;
	let resolvedCatalogDir;
	let normalizedRawDir;

	// Управление очередью запусков
	let currentRunPromise = null;
	let pendingRun = null;

	// Debounce state
	let debounceTimer = null;
	let debouncedResolvers = [];

	const logger = {
		info: (msg) => console.log(`[icons-pipeline] ${msg}`),
		warn: (msg) => console.warn(`[icons-pipeline] ${msg}`),
		error: (msg) => console.error(`[icons-pipeline] ${msg}`),
	};

	// Выполнение пайплайна (внутренняя функция)
	async function executePipeline() {
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
		}
	}

	// Безопасный запуск пайплайна с очередью — всегда возвращает Promise
	function processPipeline() {
		// Если уже выполняется — ждём текущий + ставим в очередь перезапуск
		if (currentRunPromise) {
			if (!pendingRun) {
				pendingRun = currentRunPromise.then(() => {
					pendingRun = null;
					return processPipeline();
				});
			}
			return pendingRun;
		}

		currentRunPromise = executePipeline().finally(() => {
			currentRunPromise = null;
		});

		return currentRunPromise;
	}

	// Debounced версия для watcher
	function debouncedProcessPipeline() {
		return new Promise((resolve) => {
			debouncedResolvers.push(resolve);

			if (debounceTimer) {
				clearTimeout(debounceTimer);
			}

			debounceTimer = setTimeout(async () => {
				debounceTimer = null;
				const resolvers = debouncedResolvers;
				debouncedResolvers = [];

				await processPipeline();
				resolvers.forEach(r => r());
			}, debounceMs);
		});
	}

	// Проверка, относится ли файл к rawDir
	function isRawIcon(file) {
		const normalized = normalizePath(file);
		return normalized.startsWith(normalizedRawDir) && file.endsWith('.svg');
	}

	return {
		name: 'icons-pipeline',

		configResolved(config) {
			try {
				resolvedRawDir = resolveAlias(rawDir, config);
				resolvedOutDir = resolveAlias(outDir, config);
				normalizedRawDir = normalizePath(resolvedRawDir);

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

		async buildStart() {
			await processPipeline();
		},

		configureServer(server) {
			const watcher = server.watcher;
			watcher.add(resolvedRawDir);

			const handleChange = (file, action) => {
				if (!isRawIcon(file)) return;
				logger.info(`Icon ${action}: ${path.basename(file)}`);
				debouncedProcessPipeline().then(() => {
					server.ws.send({ type: 'full-reload' });
				});
			};

			watcher.on('add', (file) => handleChange(file, 'added'));
			watcher.on('change', (file) => handleChange(file, 'changed'));
			watcher.on('unlink', (file) => handleChange(file, 'deleted'));
		},

		// Встраиваем critical‑спрайт прямо в <body> index.html
		transformIndexHtml(html) {
			const criticalSpritePath = path.join(resolvedOutDir, 'critical-sprite.svg');
			const restSpritePath = path.join(resolvedOutDir, 'rest-sprite.svg');
			const hasRestSprite = fs.existsSync(restSpritePath);

			// Regex для замены <body> с сохранением существующих атрибутов
			const bodyRegex = /<body([^>]*)>/i;
			const bodyMatch = html.match(bodyRegex);

			if (!bodyMatch) return html;

			const existingAttrs = bodyMatch[1] || '';
			const restAttr = hasRestSprite ? ' data-rest-sprite="1"' : '';
			const newBodyTag = `<body${existingAttrs}${restAttr}>`;

			let result = html.replace(bodyRegex, newBodyTag);

			if (!fs.existsSync(criticalSpritePath)) return result;

			const sprite = fs.readFileSync(criticalSpritePath, 'utf8');
			return result.replace(newBodyTag, `${newBodyTag}\n${sprite}`);
		},

		generateBundle(opts, bundle) {
			const restSpritePath = path.join(resolvedOutDir, 'rest-sprite.svg');
			if (!fs.existsSync(restSpritePath)) return;

			const sprite = fs.readFileSync(restSpritePath, 'utf8');

			// assetFileNames может быть строкой или функцией — извлекаем базовую директорию
			let assetsDir = 'assets';
			if (typeof opts.assetFileNames === 'string') {
				const firstSegment = opts.assetFileNames.split('/')[0];
				if (firstSegment && !firstSegment.includes('[')) {
					assetsDir = firstSegment;
				}
			}

			this.emitFile({
				type: 'asset',
				fileName: `${assetsDir}/icons/rest-sprite.svg`,
				source: sprite,
			});
		},
	};
}
