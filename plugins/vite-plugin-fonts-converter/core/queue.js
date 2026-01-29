export function createQueue(logger) {
	let queue = Promise.resolve();

	function enqueue(task) {
		queue = queue.then(task).catch((error) => logger.logError('ошибка процесса', error));
		return queue;
	}

	return { enqueue };
}
