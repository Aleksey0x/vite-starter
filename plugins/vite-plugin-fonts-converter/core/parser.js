import path from 'path';

const weightMatchers = [
	{ re: /(extra|ultra)bold/, weight: 800 },
	{ re: /(semi|demi)bold/, weight: 600 },
	{ re: /(extra|ultra)light/, weight: 200 },
	{ re: /thin/, weight: 100 },
	{ re: /light/, weight: 300 },
	{ re: /(regular|normal|book)/, weight: 400 },
	{ re: /medium/, weight: 500 },
	{ re: /bold/, weight: 700 },
	{ re: /(black|heavy)/, weight: 900 },
];

function normalizeFamilyKey(family) {
	return family
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

export function parseFontInfo(filePath) {
	const baseName = path.basename(filePath, '.ttf');
	const parts = baseName.split('-').filter(Boolean);
	let fontWeight = 400;
	let fontStyle = 'normal';
	const familyParts = [];

	for (const part of parts) {
		const normalized = part.toLowerCase();
		let consumed = false;

		if (/(italic|oblique)/.test(normalized)) {
			fontStyle = 'italic';
			consumed = true;
		}

		for (const matcher of weightMatchers) {
			if (matcher.re.test(normalized)) {
				fontWeight = matcher.weight;
				consumed = true;
				break;
			}
		}

		if (!consumed) {
			familyParts.push(part);
		}
	}

	const fontFamily = familyParts.length ? familyParts.join(' ') : baseName;
	const fontId = `${normalizeFamilyKey(fontFamily)}-${fontWeight}-${fontStyle}`;

	return {
		id: fontId,
		fontFamily,
		fontWeight,
		fontStyle,
		fileName: baseName,
		sourcePath: filePath,
	};
}
