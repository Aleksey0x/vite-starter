import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compression } from 'vite-plugin-compression2';
import { createHtmlPlugin } from 'vite-plugin-html';
import { visualizer } from 'rollup-plugin-visualizer';
import { iconsPipelinePlugin } from './plugins/icons-pipeline/index.js';
import fontsConverter from './plugins/vite-plugin-fonts-converter/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
	server: {
		open: true,
		port: 3000,
		host: false,
	},


	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src'),
			'@scss': path.resolve(__dirname, 'src', 'scss'),
			'@js': path.resolve(__dirname, 'src', 'js'),
			'@img': path.resolve(__dirname, 'src', 'assets', 'img'),
			'@fonts': path.resolve(__dirname, 'src', 'assets', 'fonts'),
			'@fonts/raw': path.resolve(__dirname, 'src', 'raw', 'fonts'),
			'@icons': path.resolve(__dirname, 'src', 'assets', 'icons'),
			'@icons/raw': path.resolve(__dirname, 'src', 'raw', 'icons'),
			'@dev': path.resolve(__dirname, 'src', 'dev'),
		},
	},

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
					const ext = assetInfo.name.split('.').at(-1);
					if (/png|jpe?g|svg|gif|webp|avif/i.test(ext)) {
						return 'assets/img/[name]-[hash][extname]';
					}
					if (/woff2?|ttf|otf|eot/i.test(ext)) {
						return 'assets/fonts/[name]-[hash][extname]';
					}
					return 'assets/[name]-[hash][extname]';
				},
				chunkFileNames: 'assets/js/[name]-[hash].js',
				entryFileNames: 'assets/js/[name]-[hash].js',
			},
		},
	},

	css: {
		devSourcemap: true,
	},

	plugins: [
		iconsPipelinePlugin({
			rawDir: '@icons/raw',
			outDir: '@icons',
			catalogDir: '@dev',
			rules: {
				critical: [
					'at-solid-full',
					'bars-solid-full',
					'github-brands-solid-full',
					'telegram-brands-solid-full',
				],
			},
		}),

		fontsConverter({
			sourceDir: '@fonts/raw',
			outputDir: '@fonts',
			allowedWeights: [100, 400, 600, 700], // 100, 200, 300, 400, 500, 600, 700, 800, 900
			allowedStyles: ['normal'], // normal, italic
			watch: true,
			reloadOnChange: true,
			debug: true,
			scss: {
				enabled: true,
				output: '@scss/base/_fonts.scss',
				urlAlias: '../../assets/fonts',
			},
		}),

		// HTML минификация
		createHtmlPlugin({
			minify: {
				collapseWhitespace: true,
				removeComments: true,
				minifyCSS: true,
				minifyJS: true,
			},
		}),

		// Brotli
		compression({
			algorithm: 'brotliCompress',
			exclude: [/\.(br)$/, /\.(gz)$/],
			threshold: 1024,
			deleteOriginFile: false,
		}),

		// Gzip
		compression({
			algorithm: 'gzip',
			exclude: [/\.(br)$/, /\.(gz)$/],
			threshold: 1024,
			deleteOriginFile: false,
		}),

		// Bundle analyzer
		visualizer({
			open: false,
			filename: 'stats.html',
			gzipSize: true,
			brotliSize: true,
			template: 'treemap',
		}),
	],

	base: './',
	root: './src',
});
