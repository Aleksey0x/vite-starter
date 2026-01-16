import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
	//настройки сервера
	server: {
		//настройки сервера
		open: true,
		port: 3000,
		host: true,
	},

	//настройки путей к файлам
	resolve: {
		alias: {
			//  алиасы для путей к файлам
			'@': path.resolve(__dirname, 'src'),
			'@scss': path.resolve(__dirname, 'src', 'scss'),
			'@js': path.resolve(__dirname, 'src', 'js'),
			'@img': path.resolve(__dirname, 'src', 'assets', 'img'),
			'@fonts': path.resolve(__dirname, 'src', 'assets', 'fonts'),
		},
	},

	// настройки сборки
	build: {
		outDir: '../dist',
		emptyOutDir: true,
		assetsDir: 'assets',
		sourcemap: 'hidden',
		minify: 'esbuild',
		cssMinify: 'esbuild',
		rollupOptions: {
			output: {
				assetFileNames: (assetInfo) => {
					let extType = assetInfo.name.split('.').at(-1);
					if (/png|jpe?g|svg|gif|webp|avif/i.test(extType)) {
						return 'assets/img/[name]-[hash][extname]';
					}
					if (/woff2?|ttf|otf|eot/i.test(extType)) {
						return 'assets/fonts/[name]-[hash][extname]';
					}
					return 'assets/[name]-[hash][extname]';
				},
				chunkFileNames: 'assets/js/[name]-[hash].js',
				entryFileNames: 'assets/js/[name]-[hash].js',
				manualChunks: (id) => {
					if (id.includes('node_modules')) {
						return 'vendor';
					}
				},
			},
		},
	},
	css: {
		devSourcemap: true,
	},
	base: './',
	root: './src',
});
