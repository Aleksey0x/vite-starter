# icons-pipeline

Vite-плагин для автоматической сборки SVG-спрайтов с разделением на critical и rest.

## Особенности

- Оптимизация SVG через SVGO
- Разделение иконок на critical (inline в HTML) и rest (lazy load)
- Автоматическая генерация двух спрайтов: `critical-sprite.svg` и `rest-sprite.svg`
- Dev-каталог иконок для удобной разработки
- HMR поддержка (full reload при изменениях)
- **Работа только через алиасы Vite** — нет зависимости от `root` или `__dirname`

## Установка

Плагин находится в директории проекта. Скопируйте папку `icons-pipeline` в свой проект.

## Использование

### 1. Настройка алиасов в `vite.config.js`

```javascript
import { defineConfig } from 'vite';
import path from 'node:path';
import { iconsPipelinePlugin } from './plugins/icons-pipeline/index.js';

export default defineConfig({
  resolve: {
    alias: {
      '@icons/raw': path.resolve(__dirname, 'src/raw/icons'),     // Исходные SVG
      '@icons': path.resolve(__dirname, 'src/assets/icons'),      // Выходные спрайты
      '@dev': path.resolve(__dirname, 'src/dev'),                 // Dev-каталог
    },
  },

  plugins: [
    iconsPipelinePlugin({
      rawDir: '@icons/raw',              // Алиас к исходным SVG
      outDir: '@icons',                  // Алиас к выходным спрайтам
      catalogDir: '@dev',                // Алиас к dev-каталогу (опционально)
      rules: {
        critical: [                      // Список критичных иконок
          'logo',
          'menu-burger',
          'close',
        ],
      },
    }),
  ],
});
```

### 2. Структура проекта

```
project/
├── src/
│   ├── raw/
│   │   └── icons/                  # Исходные SVG (rawDir: '@icons/raw')
│   │       ├── logo.svg
│   │       ├── menu-burger.svg
│   │       ├── close.svg
│   │       ├── arrow-right.svg
│   │       └── ...
│   ├── assets/
│   │   └── icons/                  # Спрайты (outDir: '@icons')
│   │       ├── critical-sprite.svg # Критичные иконки (inline в HTML)
│   │       └── rest-sprite.svg     # Остальные иконки (lazy load)
│   └── dev/
│       └── icons.html              # Dev-каталог (catalogDir: '@dev')
└── vite.config.js
```

### 3. Использование в HTML

#### Critical иконки (inline в `<body>`)

Плагин автоматически вставляет `critical-sprite.svg` в начало `<body>`:

```html
<!DOCTYPE html>
<html>
<body>
  <!-- Автоматически добавлено плагином -->
  <svg style="display:none">
    <symbol id="hero-logo" viewBox="0 0 24 24">...</symbol>
    <symbol id="hero-menu-burger" viewBox="0 0 24 24">...</symbol>
    <symbol id="hero-close" viewBox="0 0 24 24">...</symbol>
  </svg>

  <!-- Использование -->
  <svg class="icon"><use href="#hero-logo"/></svg>
</body>
</html>
```

#### Rest иконки (lazy load)

Спрайт `rest-sprite.svg` копируется в `dist/assets/icons/` и загружается через JS:

```javascript
// Пример загрузки rest-спрайта
fetch('/assets/icons/rest-sprite.svg')
  .then(res => res.text())
  .then(svg => {
    const div = document.createElement('div');
    div.innerHTML = svg;
    div.style.display = 'none';
    document.body.insertBefore(div, document.body.firstChild);
  });

// Использование
<svg class="icon"><use href="#icon-arrow-right"/></svg>
```

### 4. Dev-каталог

При наличии `catalogDir` генерируется `icons.html` с визуальным каталогом всех иконок:

```
http://localhost:3000/dev/icons.html
```

## API

### Опции

| Опция | Тип | Обязательно | Описание |
|-------|-----|-------------|----------|
| `rawDir` | `string` | ✓ | Алиас к директории с исходными SVG |
| `outDir` | `string` | ✓ | Алиас к выходной директории для спрайтов |
| `catalogDir` | `string` | - | Алиас к директории для dev-каталога (опционально) |
| `rules.critical` | `string[]` | - | Список имен критичных иконок (без расширения) |

### Именование иконок

- **Critical иконки**: префикс `hero-` → `hero-logo`, `hero-menu-burger`
- **Rest иконки**: префикс `icon-` → `icon-arrow-right`, `icon-star`

```javascript
rules: {
  critical: [
    'logo',          // → hero-logo
    'menu-burger',   // → hero-menu-burger
  ]
}
```

## Примеры ошибок

### Неверный алиас

```javascript
// ❌ Ошибка: алиас не найден
iconsPipelinePlugin({
  rawDir: '@icons/wrong', // Алиас не определен в resolve.alias
  outDir: '@icons',
})

// Вывод: [icons-pipeline] Alias not found in config.resolve.alias: @icons/wrong
```

### Относительный путь вместо алиаса

```javascript
// ❌ Ошибка: используется относительный путь
iconsPipelinePlugin({
  rawDir: 'src/raw/icons',  // Должен быть алиас, начинающийся с '@'
  outDir: '@icons',
})

// Вывод: [icons-pipeline] Path must be an alias starting with '@', got: src/raw/icons
```

## Оптимизация SVG

Плагин использует SVGO с настройками:
- Удаление `title`, `desc`, комментариев
- Удаление скриптов и стилей
- Удаление невидимых элементов
- Объединение path
- Сохранение `viewBox` для корректного масштабирования

## Переносимость

Плагин полностью переносим между проектами:
1. Скопируйте папку плагина
2. Настройте алиасы в `resolve.alias`
3. Используйте эти алиасы в опциях плагина

**Нет зависимости от:**
- `__dirname` или `import.meta.url`
- Структуры проекта
- Значения `root` в Vite конфиге

## Dev workflow

1. Добавьте SVG в `rawDir` (например, `src/raw/icons/new-icon.svg`)
2. Плагин автоматически:
   - Оптимизирует SVG
   - Добавит в спрайт (`critical` или `rest`)
   - Обновит dev-каталог
   - Выполнит full reload браузера
3. Используйте иконку: `<svg><use href="#icon-new-icon"/></svg>`

## Production build

При `npm run build`:
- `critical-sprite.svg` инлайнится в `index.html`
- `rest-sprite.svg` копируется в `dist/assets/icons/rest-sprite.svg`
- Dev-каталог (`icons.html`) не попадает в production
