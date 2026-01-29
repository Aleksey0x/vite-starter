import { createPlugin } from './plugin.js';

function normalizeOptions(userOptions) {
	if (!userOptions.sourceDir || !userOptions.outputDir) {
		throw new Error('[vite-plugin-fonts-converter] Both sourceDir and outputDir are required and must be aliases');
	}

	const options = {
		allowedWeights: [400, 500, 600, 700],
		allowedStyles: ['normal'],
		watch: true,
		reloadOnChange: true,
		debug: false,
		...userOptions,
	};

	const rawScss = userOptions.scss;
	let scss = null;
	if (rawScss === false) {
		scss = { enabled: false, output: null, format: 'scss' };
	} else if (rawScss && typeof rawScss === 'object') {
		if (!rawScss.output) {
			throw new Error('[vite-plugin-fonts-converter] scss.output must be provided as an alias');
		}
		scss = {
			enabled: true,
			format: 'scss',
			...rawScss,
		};
	} else {
		throw new Error('[vite-plugin-fonts-converter] scss.output must be explicitly provided as an alias');
	}

	return { ...options, scss };
}

export default function fontsConverter(userOptions = {}) {
	const options = normalizeOptions(userOptions);
	return createPlugin(options);
}
