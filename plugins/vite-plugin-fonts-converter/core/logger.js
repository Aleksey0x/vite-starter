export function createLogger(debug = false) {
	const log = (message) => console.log(`fonts: ${message}`);
	const debugLog = (message) => {
		if (debug) log(message);
	};
	const logError = (message, error) => console.error(`fonts: ${message}`, error ?? '');

	return { log, debug: debugLog, logError };
}
