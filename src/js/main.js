import Slideout from 'slideout';
document.addEventListener('DOMContentLoaded', (event) => {
	console.log('DOM fully loaded and parsed', event);
	// импортируем Slideout


	// создаём меню
	const slideout = new Slideout({
		panel: document.getElementById('panel'), // основной контент
		menu: document.getElementById('menu'),   // блок меню
		padding: 300,                            // ширина выдвигаемого меню
		side: 'left',                             // сторона появления
		tolerance: 70,                            // чувствительность свайпа
		touch: true                               // свайпы включены
	});

	// подключаем кнопку-бургер
	document.getElementById('menu-toggle').addEventListener('click', () => {
		slideout.toggle();
	});
});
