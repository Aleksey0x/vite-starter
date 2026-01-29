import fs from 'fs-extra';
import path from 'path';

export function buildScssContent(fonts) {
	const families = new Map();
	for (const font of fonts) {
		if (!families.has(font.fontFamily)) families.set(font.fontFamily, []);
		families.get(font.fontFamily).push(font);
	}

	const orderedFonts = Array.from(families.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.flatMap(([family, familyFonts]) => {
			const ordered = [...familyFonts].sort((a, b) => {
				if (a.fontWeight !== b.fontWeight) return a.fontWeight - b.fontWeight;
				return a.fontStyle.localeCompare(b.fontStyle);
			});
			return ordered.map((font) => ({ family, font }));
		});

	let scss = '// Файл автоматически сгенерирован плагином vite-plugin-fonts-converter\n';
	scss += '// Не редактируйте вручную!\n\n';

	for (const { family, font } of orderedFonts) {
		scss += '@font-face {\n';
		scss += `  font-family: '${family}';\n`;
		scss += `  src: url('@fonts/${font.fileName}.woff2') format('woff2');\n`;
		scss += `  font-weight: ${font.fontWeight};\n`;
		scss += `  font-style: ${font.fontStyle};\n`;
		scss += '  font-display: swap;\n';
		scss += '}\n\n';
	}

	const familyNames = Array.from(families.keys()).sort((a, b) => a.localeCompare(b));
	if (familyNames.length > 0) {
		scss += '// SCSS переменные (legacy)\n';
		for (const family of familyNames) {
			const varName = family.toLowerCase().replace(/\s+/g, '-');
			scss += `$${varName}: '${family}', sans-serif;\n`;
		}
	}

	return scss;
}

export async function writeScss(scssOutput, fonts) {
	const content = buildScssContent(fonts);
	await fs.ensureDir(path.dirname(scssOutput));
	await fs.writeFile(scssOutput, content);
}
