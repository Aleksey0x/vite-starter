import fs from 'fs-extra';
import path from 'path';
import ttf2woff2 from 'ttf2woff2';
import { parseFontInfo } from './parser.js';

export async function getFileStat(filePath, logger) {
	try {
		const stat = await fs.stat(filePath);
		return { mtimeMs: stat.mtimeMs, size: stat.size };
	} catch (error) {
		logger.logError(`ошибка чтения файла ${filePath}`, error);
		return null;
	}
}

export async function convertSingleFont(ttfPath, options, cacheState, logger) {
	const info = parseFontInfo(ttfPath);

	if (!options.allowedWeights.includes(info.fontWeight)) {
		logger.debug(`skip ${path.basename(ttfPath)} weight ${info.fontWeight}`);
		return { status: 'skipped', fontInfo: null, stat: null };
	}
	if (!options.allowedStyles.includes(info.fontStyle)) {
		logger.debug(`skip ${path.basename(ttfPath)} style ${info.fontStyle}`);
		return { status: 'skipped', fontInfo: null, stat: null };
	}

	const currentStat = await getFileStat(ttfPath, logger);
	if (!currentStat) {
		return { status: 'error', fontInfo: null, stat: null };
	}

	const relPath = path.relative(options.sourceDir, ttfPath);
	const cachedStat = cacheState.files?.[relPath];
	const outputPath = path.join(options.outputDir, `${info.fileName}.woff2`);

	if (cachedStat
		&& cachedStat.mtimeMs === currentStat.mtimeMs
		&& cachedStat.size === currentStat.size
		&& await fs.pathExists(outputPath)) {
		return { status: 'cached', fontInfo: info, stat: currentStat };
	}

	try {
		const ttfBuffer = await fs.readFile(ttfPath);
		const woff2Result = ttf2woff2(ttfBuffer);
		await fs.ensureDir(options.outputDir);
		await fs.writeFile(outputPath, woff2Result);
		return { status: 'converted', fontInfo: info, stat: currentStat };
	} catch (error) {
		logger.logError(`ошибка конвертации ${path.basename(ttfPath)}`, error);
		return { status: 'error', fontInfo: null, stat: null };
	}
}
