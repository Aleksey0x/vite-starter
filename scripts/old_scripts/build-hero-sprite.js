import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Абсолютный путь до текущего файла (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Папка с критическими иконками и выходной файл спрайта
const SRC_DIR = path.resolve(__dirname, '../src/assets/icons/critical/src');
const OUT_FILE = path.resolve(__dirname, '../src/assets/icons/critical/sprite.svg');

// Если папки нет — выходим без ошибки (удобно для новых проектов)
if (!fs.existsSync(SRC_DIR)) {
	console.log(`Hero icons folder not found: ${SRC_DIR}`);
	process.exit(0);
}

// Берём только SVG файлы
const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.svg'));

// Конвертируем каждый SVG в <symbol> (SVG уже оптимизирован trim-svg.js)
const symbols = files
	.map((file) => {
		const input = fs.readFileSync(path.join(SRC_DIR, file), 'utf8');

		// ID для символа: hero-имя_файла
		const id = `hero-${path.basename(file, '.svg')}`;

		// Достаём viewBox из оптимизированного SVG
		const viewBoxMatch = input.match(/viewBox="([^"]+)"/i);
		const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';

		// Вырезаем <svg> оболочку, оставляем содержимое
		const content = input
			.replace(/<svg[^>]*>/i, '')
			.replace(/<\/svg>/i, '')
			.trim();

		return `<symbol id="${id}" viewBox="${viewBox}">${content}</symbol>`;
	})
	.join('');

// Собираем спрайт
const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${symbols}</svg>`;

// Гарантируем директорию и пишем файл
fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, sprite);

console.log(`Hero sprite generated: ${OUT_FILE}`);
