import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { globSync } from 'glob';
import config from './images.config.js';

const __filename = fileURLToPath(import.meta.url); // путь к файлу
const __dirname = path.dirname(__filename); // путь к директории

const manifest = {}; // манифест

const ensureDir = (dir) => fs.existsSync(dir) || fs.mkdirSync(dir, { recursive: true }); // создание директории

for (const group of config) {
	// группа изображений
	const { input, output, widths, formats, quality, sizes } = group; // параметры группы

	const files = globSync(input, { cwd: __dirname }); // файлы

	const outputDir = path.resolve(__dirname, output); // путь к выходной директории
	ensureDir(outputDir); // создание директории

	for (const file of files) {
		const inputPath = path.resolve(__dirname, file); // путь к входному файлу
		const base = path.parse(file).name; // имя файла

		if (!manifest[base]) manifest[base] = {}; // создание манифеста

		const image = sharp(inputPath); // изображение

		for (const format of formats) {
			if (!manifest[base][format]) {
				// создание манифеста
				manifest[base][format] = {
					srcset: [],
					sizes,
				};
			}

			for (const width of widths) {
				let pipeline = image.clone().resize({ width }); // изменение размера изображения

				if (format === 'webp') pipeline = pipeline.webp({ quality: quality.webp }); // качество webp

				if (format === 'jpg')
					pipeline = pipeline.jpeg({ quality: quality.jpg, mozjpeg: true }); // качество jpg

				if (format === 'png') pipeline = pipeline.png({ compressionLevel: 9 }); // качество png

				const filename = `${base}-${width}.${format}`; // имя файла
				const outPath = path.join(outputDir, filename); // путь к выходному файлу

				await pipeline.toFile(outPath); // сохранение файла

				manifest[base][format].srcset.push(
					`${path.posix.join(path.basename(output), filename)} ${width}w` // добавление в srcset
				); // добавление в srcset

				console.log(`✔ ${outPath}`); // вывод в консоль
			}
		}

		// fallback src
		const fallbackFormat = formats.find((f) => f !== 'webp'); // fallback формат
		if (fallbackFormat) {
			manifest[base][fallbackFormat].src = `${path.basename(output)}/${base}-${
				widths[Math.floor(widths.length / 2)]
			}.${fallbackFormat}`; // fallback src
		}
	}
}

fs.writeFileSync(
	// запись в файл
	path.resolve(__dirname, '../src/assets/img/manifest.json'),
	JSON.stringify(manifest, null, 2)
); // запись в файл

console.log('✔ manifest.json generated'); // вывод в консоль
