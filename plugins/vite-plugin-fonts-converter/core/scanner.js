import fs from 'fs-extra';
import path from 'path';

export async function collectTtfFiles(dir) {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...await collectTtfFiles(fullPath));
		} else if (entry.isFile() && entry.name.toLowerCase().endsWith('.ttf')) {
			files.push(fullPath);
		}
	}
	return files;
}
