import fs from 'fs-extra';
import path from 'path';

const MAX_DEPTH = 10;

export async function collectTtfFiles(dir, depth = 0, visited = new Set()) {
	if (depth > MAX_DEPTH) return [];

	const realPath = await fs.realpath(dir);
	if (visited.has(realPath)) return [];
	visited.add(realPath);

	const entries = await fs.readdir(dir, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);

		if (entry.isSymbolicLink()) {
			try {
				const stat = await fs.stat(fullPath);
				if (stat.isDirectory()) {
					files.push(...await collectTtfFiles(fullPath, depth + 1, visited));
				} else if (stat.isFile() && entry.name.toLowerCase().endsWith('.ttf')) {
					files.push(fullPath);
				}
			} catch {
				// broken symlink
			}
		} else if (entry.isDirectory()) {
			files.push(...await collectTtfFiles(fullPath, depth + 1, visited));
		} else if (entry.isFile() && entry.name.toLowerCase().endsWith('.ttf')) {
			files.push(fullPath);
		}
	}

	return files;
}
