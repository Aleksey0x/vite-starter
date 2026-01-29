import fs from 'fs-extra';
import path from 'path';

export async function cleanupGeneratedOutputs(outputDir, currentGenerated, previousCache) {
	if (!(await fs.pathExists(outputDir))) return 0;
	const previousGenerated = new Set(previousCache.generated ?? []);
	const currentSet = new Set(currentGenerated);
	let removed = 0;

	for (const file of previousGenerated) {
		if (!currentSet.has(file)) {
			await fs.remove(path.join(outputDir, file));
			removed += 1;
		}
	}

	return removed;
}
