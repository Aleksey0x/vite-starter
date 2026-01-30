import path from 'node:path';

// Windows reserved device names (case-insensitive)
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;

/**
 * Validates that a path segment is safe for Windows
 */
export function isReservedName(segment) {
	const name = path.basename(segment, path.extname(segment));
	return WINDOWS_RESERVED.test(name);
}

/**
 * Validates a file path before writing
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

	return true;
}
