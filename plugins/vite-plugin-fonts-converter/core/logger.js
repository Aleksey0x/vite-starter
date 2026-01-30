const PREFIX = 'fonts';

export function createLogger(debug = false) {
	const log = (message) => console.log(`${PREFIX}: ${message}`);
	const debugLog = (message) => {
		if (debug) log(message);
	};
	const logError = (message, error) => console.error(`${PREFIX}: ${message}`, error ?? '');

	return { log, debug: debugLog, logError };
}
