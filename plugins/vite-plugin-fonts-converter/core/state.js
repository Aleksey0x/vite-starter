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

export function removeFontFromState(state, fontId) {
	const next = new Map(state);
	next.delete(fontId);
	return next;
}

export function setFontInState(state, fontInfo) {
	const next = new Map(state);
	next.set(fontInfo.id, fontInfo);
	return next;
}
