import Slideout from 'slideout';

export function initSlideout(options = {}) {
	const panel = document.getElementById('panel');
	const menu = document.getElementById('menu');
	const toggle = document.getElementById('menu-toggle');

	if (!panel || !menu || !toggle) {
		console.warn('Slideout: required elements not found');
		return null;
	}

	const slideout = new Slideout({
		panel,
		menu,
		padding: 160,
		side: 'left',
		tolerance: 70,
		touch: true,
		...options,
	});

	toggle.addEventListener('click', () => {
		slideout.toggle();
	});

	return slideout;
}
