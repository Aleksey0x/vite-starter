import { createPlugin } from './plugin.js';

function normalizeOptions(userOptions) {
	if (!userOptions.sourceDir || !userOptions.outputDir) {
		throw new Error('[fonts-converter] sourceDir and outputDir are required');
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
		scss = { enabled: false, output: null, urlAlias: null };
	} else if (rawScss && typeof rawScss === 'object') {
		if (!rawScss.output) {
			throw new Error('[fonts-converter] scss.output is required');
		}
		scss = {
			enabled: true,
			urlAlias: rawScss.urlAlias || userOptions.outputDir,
			...rawScss,
		};
	} else {
		throw new Error('[fonts-converter] scss.output is required');
	}

	return { ...options, scss };
}

export default function fontsConverter(userOptions = {}) {
	const options = normalizeOptions(userOptions);
	return createPlugin(options);
}
