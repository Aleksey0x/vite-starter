import autoprefixer from 'autoprefixer';
import purgecss from '@fullhuman/postcss-purgecss';
const isProd = process.env.NODE_ENV === 'production';
const purge = purgecss.default ?? purgecss;

export default {
	plugins: [
		autoprefixer(),

		isProd &&
			purge({
				content: ['./src/index.html', './src/**/*.{js,ts,jsx,tsx,vue,html}'],

				defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],

				safelist: {
					standard: ['active', 'open', 'show'],
					deep: [/^swiper-/, /^modal-/],
				},
			}),
	].filter(Boolean),
};
