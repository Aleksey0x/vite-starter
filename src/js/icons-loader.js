export async function loadRestIcons() {
	if (!document.body?.dataset?.restSprite) return;

	try {
		const response = await fetch('/assets/icons/rest-sprite.svg');
		if (!response.ok) return;

		const svg = await response.text();
		const container = document.createElement('div');
		container.innerHTML = svg;
		document.body.insertBefore(container.firstChild, document.body.firstChild);
	} catch (error) {
		console.warn('[icons] Failed to load rest sprite:', error);
	}
}
