import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const srcDir = path.resolve(root, 'src');

const sources = [
	{ title: 'critical', dir: path.resolve(srcDir, 'assets/icons/critical') },
	{ title: 'rest', dir: path.resolve(srcDir, 'assets/icons/rest') },
];

const escapeHtml = (value) =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');

const readSvgs = (dir) => {
	if (!fs.existsSync(dir)) return [];
	const out = [];
	const walk = (current) => {
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			const fullPath = path.join(current, entry.name);
			if (entry.isDirectory()) {
				walk(fullPath);
				continue;
			}
			if (!entry.name.endsWith('.svg') || entry.name === 'sprite.svg') continue;
			const raw = fs.readFileSync(fullPath, 'utf8');
			const cleaned = raw
				.replace(/<\?xml[\s\S]*?\?>/g, '')
				.replace(/<!DOCTYPE[\s\S]*?>/g, '')
				.trim();
			out.push({ name: entry.name.replace(/\.svg$/i, ''), svg: cleaned });
		}
	};
	walk(dir);
	return out;
};

const sections = sources
	.map(({ title, dir }) => {
		const items = readSvgs(dir);
		if (!items.length) return '';
		const symbolPrefix = title === 'critical' ? 'hero-' : 'icon-';
		const grid = items
			.map(
				({ name, svg }) => {
					const snippet = [
						'<svg class="icon" aria-hidden="true" focusable="false">',
						`  <use href="#${symbolPrefix}${name}"></use>`,
						'</svg>',
					].join('\n');
					const code = escapeHtml(snippet);
					return `<div class="item">
								<div class="preview">${svg}</div>
								<div class="name">${name}</div>
								<pre class="code"><code>${code}</code></pre>
							</div>`
				}
			)
			.join('\n');
		return `<section>
					<h2>${title}</h2>
					<div class="grid">${grid}</div>
				</section>`;
	})
	.join('\n');

const html = `<!DOCTYPE html>
				<html lang="ru">
				<head>
					<meta charset="UTF-8" />
					<meta name="viewport" content="width=device-width, initial-scale=1" />
					<link rel="stylesheet" href="./icons-html.css">
					<title>Icons</title>
				</head>
				<body>
				${sections || '<p>Иконки не найдены.</p>'}
				</body>
				</html>`;

fs.writeFileSync(path.resolve(srcDir, 'dev', 'icons.html'), html);

