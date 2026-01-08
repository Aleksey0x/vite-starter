import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
	//настройки сервера
	server: {
		//настройки сервера
		open: true, //открывать браузер автоматически
		port: 3000, //порт на котором будет работать сервер
		host: true, //чтобы сервер работал на всех устройствах
	},

	//настройки путей к файлам
	resolve: {
		alias: {
			//  алиасы для путей к файлам
			'@': path.resolve(__dirname, '.') /* корневой каталог */,
			'@scss': path.resolve(__dirname, 'scss') /* scss каталог */,
			'@js': path.resolve(__dirname, 'js') /* js каталог */,
			'@img': path.resolve(__dirname, 'assets', 'img') /* img каталог */,
			'@fonts': path.resolve(__dirname, 'assets', 'fonts') /* fonts каталог */,
		},
	},
});
