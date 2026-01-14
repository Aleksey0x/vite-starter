// Скрипт для конвертации шрифтов и генерации файла подключения
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import ttf2woff from 'ttf2woff';
import ttf2woff2 from 'ttf2woff2';

// Получаем текущую директорию в ES модулях
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Пути к директориям
const sourceDir = path.resolve(__dirname, 'src/static/fonts');
const targetDir = path.resolve(__dirname, 'src/assets/fonts');
const fontsScssPath = path.resolve(__dirname, 'src/scss/fonts.scss');

console.log('Директория с исходными шрифтами:', sourceDir);

// Создаем директорию для шрифтов, если она не существует
fs.ensureDirSync(targetDir);

// Функция для извлечения информации о шрифте из имени файла
function getFontInfo(filename) {
	// Предполагаем, что имя файла имеет формат: FontName-Weight.ttf
	const baseName = path.basename(filename, '.ttf');
	const parts = baseName.split('-');

	const fontFamily = parts[0];
	let fontWeight = 400; // По умолчанию Regular
	let fontStyle = 'normal'; // По умолчанию normal

	// Определяем вес шрифта на основе его названия
	if (parts.length > 1) {
		const weightName = parts[1].toLowerCase();

		if (weightName.includes('thin')) fontWeight = 100;
		else if (weightName.includes('extralight') || weightName.includes('ultralight'))
			fontWeight = 200;
		else if (weightName.includes('light')) fontWeight = 300;
		else if (weightName.includes('regular') || weightName === 'normal') fontWeight = 400;
		else if (weightName.includes('medium')) fontWeight = 500;
		else if (weightName.includes('semibold') || weightName.includes('demibold'))
			fontWeight = 600;
		else if (weightName.includes('bold')) fontWeight = 700;
		else if (weightName.includes('extrabold') || weightName.includes('ultrabold'))
			fontWeight = 800;
		else if (weightName.includes('black') || weightName.includes('heavy')) fontWeight = 900;

		// Проверяем стиль
		if (weightName.includes('italic')) fontStyle = 'italic';
	}

	return {
		fontFamily,
		fontWeight,
		fontStyle,
	};
}

// Функция для конвертации TTF в WOFF и WOFF2
function convertFonts() {
	console.log('Начинаем конвертацию шрифтов...');

	// Проверяем, существует ли директория с исходными шрифтами
	if (!fs.existsSync(sourceDir)) {
		console.error(`Директория с исходными шрифтами не найдена: ${sourceDir}`);
		return;
	}

	// Получаем список всех TTF файлов с помощью fs вместо glob
	let ttfFiles = [];
	try {
		const files = fs.readdirSync(sourceDir);
		ttfFiles = files
			.filter((file) => file.toLowerCase().endsWith('.ttf'))
			.map((file) => path.join(sourceDir, file));
	} catch (error) {
		console.error('Ошибка при чтении директории:', error);
		return;
	}

	console.log(`Найдено TTF файлов: ${ttfFiles.length}`);

	if (ttfFiles.length === 0) {
		console.log('TTF файлы не найдены. Проверьте путь и наличие файлов.');
		return;
	}

	// Информация о шрифтах для генерации SCSS
	const fontsInfo = [];

	// Конвертируем каждый TTF файл
	for (const ttfPath of ttfFiles) {
		const fileName = path.basename(ttfPath);
		const fileNameWithoutExt = path.basename(ttfPath, '.ttf');
		const fontInfo = getFontInfo(fileName);

		console.log(`Конвертация ${fileName}...`);

		// Добавляем информацию о шрифте
		fontsInfo.push({
			...fontInfo,
			fileName: fileNameWithoutExt,
		});

		try {
			// Чтение TTF файла
			const ttfBuffer = fs.readFileSync(ttfPath);

			// Конвертация в WOFF
			const woffResult = ttf2woff(new Uint8Array(ttfBuffer), {});
			fs.writeFileSync(
				path.join(targetDir, `${fileNameWithoutExt}.woff`),
				Buffer.from(woffResult.buffer)
			);

			// Конвертация в WOFF2
			const woff2Result = ttf2woff2(ttfBuffer);
			fs.writeFileSync(path.join(targetDir, `${fileNameWithoutExt}.woff2`), woff2Result);

			// Удаляем копирование TTF файлов в целевую директорию

			console.log(`${fileName} успешно конвертирован в WOFF и WOFF2`);
		} catch (error) {
			console.error(`Ошибка при конвертации ${fileName}:`, error);
		}
	}

	// Генерируем SCSS с объявлениями @font-face
	if (fontsInfo.length > 0) {
		generateFontsSCSS(fontsInfo);
	} else {
		console.log('Нет информации о шрифтах для генерации SCSS.');
	}
}

// Функция для генерации SCSS файла с @font-face объявлениями
function generateFontsSCSS(fontsInfo) {
	console.log('Генерация файла fonts.scss...');

	// Группируем шрифты по семейству
	const fontFamilies = {};

	fontsInfo.forEach((font) => {
		if (!fontFamilies[font.fontFamily]) {
			fontFamilies[font.fontFamily] = [];
		}

		fontFamilies[font.fontFamily].push(font);
	});

	// Формируем содержимое SCSS файла
	let scssContent = '// Файл автоматически сгенерирован скриптом convertFonts.js\n\n';

	// Создаем @font-face для каждого шрифта
	// Используем относительные пути - Vite перепишет их правильно при сборке с учетом base
	Object.keys(fontFamilies).forEach((family) => {
		fontFamilies[family].forEach((font) => {
			scssContent += `@font-face {\n`;
			scssContent += `  font-family: '${family}';\n`;
			scssContent += `  src: url('../assets/fonts/${font.fileName}.woff2') format('woff2'),\n`;
			scssContent += `       url('../assets/fonts/${font.fileName}.woff') format('woff');\n`;
			scssContent += `  font-weight: ${font.fontWeight};\n`;
			scssContent += `  font-style: ${font.fontStyle};\n`;
			scssContent += `  font-display: swap;\n`;
			scssContent += `}\n\n`;
		});
	});

	// Добавляем вспомогательные переменные для использования шрифтов
	scssContent += '// Переменные для использования шрифтов\n';
	Object.keys(fontFamilies).forEach((family) => {
		const variableName = family.toLowerCase();
		scssContent += `$${variableName}: '${family}', sans-serif;\n`;
	});

	// Записываем в файл
	fs.writeFileSync(fontsScssPath, scssContent);
	console.log(`Файл fonts.scss успешно сгенерирован: ${fontsScssPath}`);
}

// Запускаем конвертацию
convertFonts();
