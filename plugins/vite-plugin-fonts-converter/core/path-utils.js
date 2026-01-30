import path from 'path';

// Windows reserved device names (case-insensitive)
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;

/**
 * Validates that a path segment is safe for Windows
 * @param {string} segment - Path segment to validate
 * @returns {boolean}
 */
export function isReservedName(segment) {
	const name = path.basename(segment, path.extname(segment));
	return WINDOWS_RESERVED.test(name);
}

/**
 * Validates a file path before writing
 * @param {string} filePath - Full path to validate
 * @throws {Error} if path is invalid
 */
export function validatePath(filePath) {
	if (!filePath || typeof filePath !== 'string') {
		throw new Error(`Invalid path: ${filePath}`);
	}

	const segments = filePath.split(/[/\\]/).filter(Boolean);

	for (const segment of segments) {
		if (isReservedName(segment)) {
			throw new Error(`Reserved Windows name in path: ${segment}`);
		}
	}

	const basename = path.basename(filePath);
	if (!basename || basename === '.' || basename === '..') {
		throw new Error(`Invalid filename: ${basename}`);
	}

	return true;
}

/**
 * Safe path.join that validates result
 * @param  {...string} segments - Path segments
 * @returns {string}
 */
export function safeJoin(...segments) {
	const filtered = segments.filter(s => s && typeof s === 'string');

	if (filtered.length === 0) {
		throw new Error('safeJoin requires at least one valid path segment');
	}

	const result = path.join(...filtered);
	validatePath(result);

	return result;
}
