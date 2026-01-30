import fs from 'fs-extra';
import path from 'path';
import ttf2woff2 from 'ttf2woff2';
import { parseFontInfo } from './parser.js';
import { validatePath } from './path-utils.js';

const TTF_MAGIC = [0x00, 0x01, 0x00, 0x00];
const OTF_MAGIC = [0x4f, 0x54, 0x54, 0x4f]; // OTTO

function isValidTtf(buffer) {
	if (buffer.length < 4) return false;
	const header = [...buffer.slice(0, 4)];
	return (
		header.every((b, i) => b === TTF_MAGIC[i]) ||
		header.every((b, i) => b === OTF_MAGIC[i])
	);
}

export async function getFileStat(filePath, logger) {
	try {
		const stat = await fs.stat(filePath);
		return { mtimeMs: stat.mtimeMs, size: stat.size };
	} catch (error) {
		logger.logError(`stat failed: ${filePath}`, error);
		return null;
	}
}

export async function convertSingleFont(ttfPath, options, cacheState, logger) {
	const info = parseFontInfo(ttfPath);

	if (!options.allowedWeights.includes(info.fontWeight)) {
		logger.debug(`skip weight ${info.fontWeight}: ${path.basename(ttfPath)}`);
		return { status: 'skipped', fontInfo: null, stat: null };
	}

	if (!options.allowedStyles.includes(info.fontStyle)) {
		logger.debug(`skip style ${info.fontStyle}: ${path.basename(ttfPath)}`);
		return { status: 'skipped', fontInfo: null, stat: null };
	}

	const currentStat = await getFileStat(ttfPath, logger);
	if (!currentStat) {
		return { status: 'error', fontInfo: null, stat: null };
	}

	const relPath = path.relative(options.resolvedSourceDir, ttfPath);
	const cachedStat = cacheState.files?.[relPath];
	const outputPath = path.join(options.resolvedOutputDir, `${info.fileName}.woff2`);

	validatePath(outputPath);

	if (
		cachedStat &&
		cachedStat.mtimeMs === currentStat.mtimeMs &&
		cachedStat.size === currentStat.size &&
		await fs.pathExists(outputPath)
	) {
		return { status: 'cached', fontInfo: info, stat: currentStat };
	}

	try {
		const ttfBuffer = await fs.readFile(ttfPath);

		if (!isValidTtf(ttfBuffer)) {
			logger.logError(`invalid TTF: ${path.basename(ttfPath)}`);
			return { status: 'error', fontInfo: null, stat: null };
		}

		const woff2Result = ttf2woff2(ttfBuffer);
		await fs.ensureDir(options.resolvedOutputDir);
		await fs.writeFile(outputPath, woff2Result);

		return { status: 'converted', fontInfo: info, stat: currentStat };
	} catch (error) {
		logger.logError(`convert failed: ${path.basename(ttfPath)}`, error);
		return { status: 'error', fontInfo: null, stat: null };
	}
}
