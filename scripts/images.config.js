export default [
	{
		name: 'hero',
		input: '../src/static/raw/hero/*.jpg',
		output: '../src/assets/img/hero',
		widths: [640, 1024, 1440, 1920, 2560],
		formats: ['webp', 'jpg'],
		sizes: '100vw',
		quality: { webp: 100, jpg: 80 },
	},

	{
		name: 'logo',
		input: '../src/static/raw/logo/*.png',
		output: '../src/assets/img/logo',
		widths: [170, 240, 340, 480, 680],
		formats: ['webp', 'png'],
		sizes: '',
		quality: { webp: 100, png: 80 },
	},
	{
		name: 'products',
		input: '../src/static/raw/products/*.jpg',
		output: '../src/assets/img/products',
		widths: [300, 600, 900],
		formats: ['webp', 'jpg'],
		sizes: '(max-width: 768px) 50vw, 300px',
		quality: { webp: 80, jpg: 80 },
	},

	{
		name: 'ui',
		input: '../src/static/raw/ui/*.png',
		output: '../src/assets/img/ui',
		widths: [200, 400, 600],
		formats: ['webp', 'png'],
		sizes: '200px',
		quality: { webp: 90, png: 100 },
	},
];
