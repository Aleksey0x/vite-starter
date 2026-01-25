export default [
	// {
	// 	name: 'hero',
	// 	input: '../src/raw/img/hero/*.jpg',
	// 	output: '../src/assets/img/hero',
	// 	widths: [640, 1024, 1440, 1920, 2560],
	// 	formats: ['avif', 'webp', 'jpg'],
	// 	sizes: '100vw',
	// 	quality: { avif: 65, webp: 85, jpg: 80 },
	// },

	{
		name: 'logo',
		input: '../src/raw/img/logo/*.png',
		output: '../src/assets/img/logo',
		widths: [170, 240, 340, 480, 680],
		formats: ['avif', 'webp', 'png'],
		sizes: '',
		quality: { avif: 70, webp: 85, png: 80 },
	},
	// {
	// 	name: 'products',
	// 	input: '../src/raw/img/products/*.jpg',
	// 	output: '../src/assets/img/products',
	// 	widths: [300, 600, 900],
	// 	formats: ['avif', 'webp', 'jpg'],
	// 	sizes: '(max-width: 768px) 50vw, 300px',
	// 	quality: { avif: 60, webp: 80, jpg: 80 },
	// },

	// {
	// 	name: 'ui',
	// 	input: '../src/raw/img/ui/*.png',
	// 	output: '../src/assets/img/ui',
	// 	widths: [200, 400, 600],
	// 	formats: ['avif', 'webp', 'png'],
	// 	sizes: '200px',
	// 	quality: { avif: 70, webp: 85, png: 100 },
	// },
];
