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

const CACHE_FILE = '.fonts-cache.json';

function resolveAlias(aliasPath, config) {
	if (!aliasPath.startsWith('@')) {
		throw new Error(`Path must be alias starting with '@': ${aliasPath}`);
	}

	const aliases = config.resolve?.alias || {};
	const aliasEntries = Array.isArray(aliases) ? aliases : Object.entries(aliases);

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

	throw new Error(`Alias not found: ${aliasPath}`);
}

export function createPlugin(options) {
	const logger = createLogger(options.debug);

	let server = null;
	let rootDir = null;
	let isBuilding = false;
	let cache = null;
	let fontsById = createState();
	let isShuttingDown = false;

	const queue = createQueue(logger);

	// Resolved paths (set in configResolved)
	let resolvedSourceDir = null;
	let resolvedOutputDir = null;
	let resolvedScssOutput = null;
	let resolvedUrlAlias = null;

	const toRel = (filePath) => path.relative(resolvedSourceDir, filePath);
	const toOutputName = (fileName) => `${fileName}.woff2`;
	const getOutputPath = (fileName) => path.join(resolvedOutputDir, toOutputName(fileName));

	async function ensureCache() {
		if (!cache) {
			cache = await loadCache(resolvedOutputDir, CACHE_FILE);
		}
		return cache;
	}

	async function processFonts() {
		if (!(await fs.pathExists(resolvedSourceDir))) {
			return { fonts: [], nextCache: createEmptyCache(), stats: null };
		}

		let ttfFiles = [];
		try {
			ttfFiles = await collectTtfFiles(resolvedSourceDir);
		} catch (error) {
			logger.logError('scan failed', error);
			return { fonts: [], nextCache: createEmptyCache(), stats: null };
		}

		const previousCache = await ensureCache();
		const nextCache = createEmptyCache();
		const fonts = [];
		let converted = 0, cached = 0, skipped = 0, errors = 0;

		const opts = { ...options, resolvedSourceDir, resolvedOutputDir };

		for (const ttfPath of ttfFiles) {
			if (isShuttingDown) break;

			const result = await convertSingleFont(ttfPath, opts, previousCache, logger);

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

			if (result.status === 'converted') converted++;
			if (result.status === 'cached') cached++;
			if (result.status === 'skipped') skipped++;
			if (result.status === 'error') errors++;
		}

		nextCache.generated = fonts.map((font) => toOutputName(font.fileName));

		return { fonts, nextCache, stats: { converted, cached, skipped, errors } };
	}

	async function processAllFonts() {
		if (isShuttingDown) return;

		const startedAt = Date.now();
		logger.log(isBuilding ? 'build start' : 'dev start');

		const previousCache = await ensureCache();
		const { fonts, nextCache, stats } = await processFonts();

		if (isShuttingDown) return;

		fontsById = updateFontsState(fontsById, fonts);

		const removed = await cleanupGeneratedOutputs(resolvedOutputDir, nextCache.generated, previousCache);

		if (options.scss.enabled) {
			await writeScss(resolvedScssOutput, [...fontsById.values()], resolvedUrlAlias);
		}

		await writeCache(resolvedOutputDir, CACHE_FILE, nextCache);
		cache = nextCache;

		const elapsed = Date.now() - startedAt;
		if (stats) {
			logger.log(`done: ${fontsById.size} fonts, ${stats.converted} new, ${stats.cached} cached, ${stats.skipped} skipped, ${removed} removed (${elapsed}ms)`);
			if (stats.errors > 0) logger.log(`errors: ${stats.errors}`);
		}
	}

	async function removeFontByPath(ttfPath) {
		const relPath = toRel(ttfPath);
		const cacheState = await ensureCache();

		const cached = cacheState.files?.[relPath];
		if (cached?.output && cacheState.generated?.includes(cached.output)) {
			await fs.remove(path.join(resolvedOutputDir, cached.output));
		}

		if (cacheState.files && cacheState.files[relPath]) {
			delete cacheState.files[relPath];
		}

		cacheState.generated = (cacheState.generated ?? []).filter((file) => file !== cached?.output);
		await writeCache(resolvedOutputDir, CACHE_FILE, cacheState);
		cache = cacheState;

		const info = parseFontInfo(ttfPath);
		const next = new Map(fontsById);
		next.delete(info.id);
		fontsById = next;
	}

	function tryCssReload() {
		if (!server || !options.scss.enabled) return false;

		const rel = path.relative(rootDir, resolvedScssOutput).replace(/\\/g, '/');
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
		if (isShuttingDown) return;
		if (!filePath.toLowerCase().endsWith('.ttf')) return;

		const opts = { ...options, resolvedSourceDir, resolvedOutputDir };

		if (!(await fs.pathExists(filePath))) {
			await removeFontByPath(filePath);
			if (options.scss.enabled) {
				await writeScss(resolvedScssOutput, [...fontsById.values()], resolvedUrlAlias);
			}
			reloadClient();
			return;
		}

		const cacheState = await ensureCache();
		const result = await convertSingleFont(filePath, opts, cacheState, logger);
		const relPath = toRel(filePath);

		if (result.status === 'skipped' || result.status === 'error') {
			await removeFontByPath(filePath);
		} else if (result.fontInfo && result.stat) {
			const existing = fontsById.get(result.fontInfo.id);

			if (existing && existing.fileName !== result.fontInfo.fileName) {
				const oldOutput = toOutputName(existing.fileName);
				if (cacheState.generated?.includes(oldOutput)) {
					await fs.remove(path.join(resolvedOutputDir, oldOutput));
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

			await writeCache(resolvedOutputDir, CACHE_FILE, cacheState);
			cache = cacheState;
		}

		if (options.scss.enabled) {
			await writeScss(resolvedScssOutput, [...fontsById.values()], resolvedUrlAlias);
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
				resolvedSourceDir = resolveAlias(options.sourceDir, config);
				resolvedOutputDir = resolveAlias(options.outputDir, config);
				resolvedScssOutput = options.scss.enabled ? resolveAlias(options.scss.output, config) : null;
				resolvedUrlAlias = options.scss.urlAlias || options.outputDir;
			} catch (error) {
				throw new Error(`[fonts-converter] ${error.message}`);
			}

			logger.debug(`mode: ${isBuilding ? 'build' : 'dev'}`);
			logger.log(`source: ${resolvedSourceDir}`);
			logger.log(`output: ${resolvedOutputDir}`);
			if (resolvedScssOutput) {
				logger.log(`scss: ${resolvedScssOutput}`);
			}
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
				server.watcher.add(resolvedSourceDir);

				const onChange = (filePath) => queue.enqueue(() => handleFileChange(filePath));
				server.watcher.on('change', onChange);
				server.watcher.on('add', onChange);
				server.watcher.on('unlink', onChange);
			}

			server.httpServer?.on('close', () => {
				isShuttingDown = true;
			});
		},
	};
}
