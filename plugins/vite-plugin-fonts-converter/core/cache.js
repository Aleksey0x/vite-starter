import fs from 'fs-extra';
import path from 'path';

export const CACHE_VERSION = 1;

export function createEmptyCache() {
	return { version: CACHE_VERSION, files: {}, generated: [] };
}

export function normalizeCache(raw) {
	if (raw?.version === CACHE_VERSION && raw.files && raw.generated) {
		return raw;
	}
	if (raw && typeof raw === 'object') {
		const files = {};
		for (const [relPath, stat] of Object.entries(raw)) {
			if (stat && typeof stat.mtimeMs === 'number' && typeof stat.size === 'number') {
				files[relPath] = { ...stat };
			}
		}
		return { version: CACHE_VERSION, files, generated: [] };
	}
	return createEmptyCache();
}

export async function loadCache(outputDir, cacheFileName) {
	const cachePath = path.join(outputDir, cacheFileName);
	try {
		if (!(await fs.pathExists(cachePath))) {
			return createEmptyCache();
		}
		const raw = JSON.parse(await fs.readFile(cachePath, 'utf8'));
		return normalizeCache(raw);
	} catch {
		return createEmptyCache();
	}
}

export async function writeCache(outputDir, cacheFileName, cacheData) {
	await fs.ensureDir(outputDir);
	const cachePath = path.join(outputDir, cacheFileName);
	await fs.writeFile(cachePath, JSON.stringify(cacheData, null, 2));
}
