import autoprefixer from 'autoprefixer';
import purgecss from '@fullhuman/postcss-purgecss';
import sortMediaQueries from 'postcss-sort-media-queries';
import cssnano from 'cssnano';

const purge = purgecss.default ?? purgecss;

export default ({ env }) => {
	const isProd =
		env === 'production' ||
		process.env.NODE_ENV === 'production';

	return {
		plugins: [
			autoprefixer(),

			isProd && purge({
				content: ['./src/**/*.html', './src/js/**/*.js'],
				defaultExtractor: (content) => {
					// Игнорируем HTML-комментарии
					const clean = content.replace(/<!--[\s\S]*?-->/g, '');
					return clean.match(/[\w-/:]+(?<!:)/g) || [];
				},
				safelist: {
					standard: [
						'active',
						'show',
						'hide',
						'fade',
						'collapse',
						'collapsed',
						'slideout',
						'slideout-panel',
						'slideout-open',
						'slideout-close',
						'slideout-menu',
						'slideout-menu-left',
						'slideout-menu-right',
					],
					deep: [/^swiper/],
					greedy: [/\[data-/, /\[aria-/],
				},
			}),

			isProd && sortMediaQueries({ sort: 'mobile-first' }),

			isProd && cssnano({
				preset: ['default', {
					discardComments: { removeAll: true },
					zindex: false,
					calc: false,
				}],
			}),
		].filter(Boolean),
	};
};
