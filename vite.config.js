import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { compression } from 'vite-plugin-compression2';
import { createHtmlPlugin } from 'vite-plugin-html';
import { visualizer } from 'rollup-plugin-visualizer';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';

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
		// SVG спрайт
		createSvgIconsPlugin({
			iconDirs: [path.resolve(process.cwd(), 'src/assets/icons/rest')],
			symbolId: 'icon-[name]',
		}),

		// Критический SVG спрайт: инлайн в HTML
		{
			name: 'inline-hero-sprite',
			transformIndexHtml(html) {
				const spritePath = path.resolve(__dirname, 'src/assets/icons/critical/sprite.svg');
				if (!fs.existsSync(spritePath)) return html;
				const sprite = fs.readFileSync(spritePath, 'utf8');
				return html.replace('<body>', `<body>\n${sprite}`);
			},
		},

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
