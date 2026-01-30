export function createState() {
	return new Map();
}

export function updateFontsState(state, fonts) {
	const next = new Map();
	for (const font of fonts) {
		next.set(font.id, font);
	}
	return next;
}
