import fs from 'fs-extra';
import path from 'path';
import { createLogger } from './core/logger.js';
import { collectTtfFiles } from './core/scanner.js';
import { parseFontInfo } from './core/parser.js';
import { convertSingleFont } from './core/converter.js';
import { loadCache, writeCache, createEmptyCache } from './core/cache.js';
import { writeScss } from './core/scss.js';
import { updateFontsState, createState } from './core/state.js';
import { cleanupGeneratedOutputs } from './core/cleanup.js';
import { createQueue } from './core/queue.js';

function resolveAlias(aliasPath, config) {
	if (!aliasPath.startsWith('@')) {
		throw new Error(`[vite-plugin-fonts-converter] Path must be an alias starting with '@', got: ${aliasPath}`);
	}

	const aliases = config.resolve?.alias || {};
	const aliasEntries = Array.isArray(aliases) ? aliases : Object.entries(aliases);

	// Сортируем по длине ключа (длинные первыми), чтобы '@fonts/raw' матчился раньше '@fonts'
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

	throw new Error(`[vite-plugin-fonts-converter] Alias not found in config.resolve.alias: ${aliasPath}`);
}

export function createPlugin(options) {
	const logger = createLogger(options.debug);
	const cacheFileName = '.fonts-cache.json';

	let server = null;
	let rootDir = null;
	let isBuilding = false;
	let cache = null;
	let fontsById = createState();
	const queue = createQueue(logger);

	const toRel = (filePath) => path.relative(options.sourceDir, filePath);
	const toOutputName = (fileName) => `${fileName}.woff2`;
	const getOutputPath = (fileName) => path.join(options.outputDir, toOutputName(fileName));

	async function processFonts() {
		if (!(await fs.pathExists(options.sourceDir))) {
			return { fonts: [], nextCache: createEmptyCache(), stats: null };
		}

		let ttfFiles = [];
		try {
			ttfFiles = await collectTtfFiles(options.sourceDir);
		} catch (error) {
			logger.logError('ошибка чтения директории', error);
			return { fonts: [], nextCache: createEmptyCache(), stats: null };
		}

		const previousCache = cache ?? await loadCache(options.outputDir, cacheFileName);
		if (!cache) cache = previousCache;

		const nextCache = createEmptyCache();
		const fonts = [];
		let converted = 0;
		let cached = 0;
		let skipped = 0;
		let errors = 0;

		for (const ttfPath of ttfFiles) {
			const result = await convertSingleFont(ttfPath, options, previousCache, logger);
			if (result.fontInfo) {
				fonts.push(result.fontInfo);
			}
			if (result.stat && result.fontInfo) {
				const relPath = toRel(ttfPath);
				nextCache.files[relPath] = {
					...result.stat,
					fontId: result.fontInfo.id,
					output: toOutputName(result.fontInfo.fileName),
				};
			}
			if (result.status === 'converted') converted += 1;
			if (result.status === 'cached') cached += 1;
			if (result.status === 'skipped') skipped += 1;
			if (result.status === 'error') errors += 1;
		}

		nextCache.generated = fonts.map((font) => toOutputName(font.fileName));

		return {
			fonts,
			nextCache,
			stats: { converted, cached, skipped, errors },
		};
	}

	async function processAllFonts() {
		const startedAt = Date.now();
		logger.log(isBuilding ? 'start build' : 'start dev');

		const previousCache = cache ?? await loadCache(options.outputDir, cacheFileName);
		if (!cache) cache = previousCache;

		const { fonts, nextCache, stats } = await processFonts();
		fontsById = updateFontsState(fontsById, fonts);

		const removed = await cleanupGeneratedOutputs(options.outputDir, nextCache.generated, previousCache);

		if (options.scss.enabled) {
			await writeScss(options.scss.output, [...fontsById.values()]);
		}

		await writeCache(options.outputDir, cacheFileName, nextCache);
		cache = nextCache;

		const elapsed = Date.now() - startedAt;
		if (stats) {
			logger.log(`summary: ${fontsById.size} fonts, ${stats.converted} converted, ${stats.cached} cached, ${stats.skipped} skipped, ${removed} removed (${elapsed}ms)`);
			if (stats.errors > 0) logger.log(`errors: ${stats.errors}`);
		}
	}

	async function removeFontByPath(ttfPath) {
		const relPath = toRel(ttfPath);
		const cacheState = cache ?? await loadCache(options.outputDir, cacheFileName);
		if (!cache) cache = cacheState;

		const cached = cacheState.files?.[relPath];
		if (cached?.output && cacheState.generated?.includes(cached.output)) {
			await fs.remove(path.join(options.outputDir, cached.output));
		}

		delete cacheState.files?.[relPath];
		cacheState.generated = (cacheState.generated ?? []).filter((file) => file !== cached?.output);
		await writeCache(options.outputDir, cacheFileName, cacheState);
		cache = cacheState;

		const info = parseFontInfo(ttfPath);
		const next = new Map(fontsById);
		next.delete(info.id);
		fontsById = next;
	}

	function tryCssReload() {
		if (!server || !options.scss.enabled) return false;
		const rel = path.relative(rootDir, options.scss.output).replace(/\\/g, '/');
		const url = rel.startsWith('/') ? rel : `/${rel}`;
		const mod = server.moduleGraph.getModuleByUrl(url);
		if (!mod) return false;
		server.ws.send({
			type: 'update',
			updates: [{
				type: 'css-update',
				path: url,
				acceptedPath: url,
				timestamp: Date.now(),
			}],
		});
		return true;
	}

	function reloadClient() {
		if (!options.reloadOnChange || !server) return;
		if (!tryCssReload()) {
			server.ws.send({ type: 'full-reload' });
		}
	}

	async function handleFileChange(filePath) {
		if (!filePath.toLowerCase().endsWith('.ttf')) return;

		if (!(await fs.pathExists(filePath))) {
			await removeFontByPath(filePath);
			if (options.scss.enabled) {
				await writeScss(options.scss.output, [...fontsById.values()]);
			}
			reloadClient();
			return;
		}

		const cacheState = cache ?? await loadCache(options.outputDir, cacheFileName);
		if (!cache) cache = cacheState;

		const result = await convertSingleFont(filePath, options, cacheState, logger);
		const relPath = toRel(filePath);

		if (result.status === 'skipped' || result.status === 'error') {
			await removeFontByPath(filePath);
		} else if (result.fontInfo && result.stat) {
			const existing = fontsById.get(result.fontInfo.id);
			if (existing && existing.fileName !== result.fontInfo.fileName) {
				const oldOutput = toOutputName(existing.fileName);
				if (cacheState.generated?.includes(oldOutput)) {
					await fs.remove(path.join(options.outputDir, oldOutput));
					cacheState.generated = cacheState.generated.filter((file) => file !== oldOutput);
				}
			}

			const next = new Map(fontsById);
			next.set(result.fontInfo.id, result.fontInfo);
			fontsById = next;

			cacheState.files[relPath] = {
				...result.stat,
				fontId: result.fontInfo.id,
				output: toOutputName(result.fontInfo.fileName),
			};
			if (!cacheState.generated.includes(cacheState.files[relPath].output)) {
				cacheState.generated.push(cacheState.files[relPath].output);
			}
			await writeCache(options.outputDir, cacheFileName, cacheState);
			cache = cacheState;
		}

		if (options.scss.enabled) {
			await writeScss(options.scss.output, [...fontsById.values()]);
		}
		reloadClient();
	}

	return {
		name: 'vite-plugin-fonts-converter',
		enforce: 'pre',

		configResolved(config) {
			isBuilding = config.command === 'build';
			rootDir = config.root;

			try {
				options.sourceDir = resolveAlias(options.sourceDir, config);
				options.outputDir = resolveAlias(options.outputDir, config);
				options.scss.output = resolveAlias(options.scss.output, config);
			} catch (error) {
				throw new Error(`[vite-plugin-fonts-converter] Failed to resolve aliases: ${error.message}`);
			}

			logger.debug(`mode ${isBuilding ? 'build' : 'dev'}`);
			logger.log(`sourceDir resolved: ${options.sourceDir}`);
			logger.log(`outputDir resolved: ${options.outputDir}`);
			logger.log(`scss.output resolved: ${options.scss.output}`);
		},

		async buildStart() {
			if (isBuilding) {
				await processAllFonts();
			}
		},

		configureServer(devServer) {
			server = devServer;
			queue.enqueue(() => processAllFonts());

			if (options.watch && !isBuilding) {
				server.watcher.add(options.sourceDir);

				const onChange = (filePath) => queue.enqueue(() => handleFileChange(filePath));
				server.watcher.on('change', onChange);
				server.watcher.on('add', onChange);
				server.watcher.on('unlink', onChange);
			}
		},
	};
}
