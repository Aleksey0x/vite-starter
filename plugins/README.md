# Vite Plugins

Набор переиспользуемых Vite-плагинов для работы со шрифтами и иконками.

## Плагины

### 1. [vite-plugin-fonts-converter](./vite-plugin-fonts-converter/)

Автоматическая конвертация TTF → WOFF2 с генерацией SCSS.

**Функции:**
- Конвертация TTF в WOFF2
- Генерация `@font-face` в SCSS
- Интеллектуальное кеширование
- HMR в dev режиме

### 2. [icons-pipeline](./icons-pipeline/)

Сборка SVG-спрайтов с разделением на critical и rest.

**Функции:**
- Оптимизация SVG через SVGO
- Critical спрайт (inline в HTML)
- Rest спрайт (lazy load)
- Dev-каталог иконок
- HMR в dev режиме

## Общие принципы

Оба плагина используют **только алиасы Vite** для путей:

```javascript
// ✅ Правильно — алиасы
sourceDir: '@fonts/raw'
outputDir: '@fonts'

// ❌ Неправильно — относительные пути
sourceDir: 'raw/fonts'
outputDir: 'src/assets/fonts'
```

### Преимущества подхода с алиасами

1. **Независимость от `root`** — плагины работают при любом значении `root` в Vite
2. **Переносимость** — копируй папку плагина и настраивай только алиасы
3. **Явная конфигурация** — все пути управляются централизованно через `resolve.alias`
4. **Понятные ошибки** — если алиас не найден, выводится четкое сообщение

## Полный пример конфигурации

```javascript
import { defineConfig } from 'vite';
import path from 'node:path';
import { iconsPipelinePlugin } from './plugins/icons-pipeline/index.js';
import fontsConverter from './plugins/vite-plugin-fonts-converter/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Общие алиасы
      '@': path.resolve(__dirname, 'src'),
      '@scss': path.resolve(__dirname, 'src/scss'),
      '@dev': path.resolve(__dirname, 'src/dev'),
      
      // Для fonts-converter
      '@fonts/raw': path.resolve(__dirname, 'raw/fonts'),
      '@fonts': path.resolve(__dirname, 'src/assets/fonts'),
      
      // Для icons-pipeline
      '@icons/raw': path.resolve(__dirname, 'src/raw/icons'),
      '@icons': path.resolve(__dirname, 'src/assets/icons'),
    },
  },

  plugins: [
    // Иконки
    iconsPipelinePlugin({
      rawDir: '@icons/raw',
      outDir: '@icons',
      catalogDir: '@dev',
      rules: {
        critical: ['logo', 'menu', 'close'],
      },
    }),

    // Шрифты
    fontsConverter({
      sourceDir: '@fonts/raw',
      outputDir: '@fonts',
      allowedWeights: [400, 600, 700],
      allowedStyles: ['normal', 'italic'],
      scss: {
        enabled: true,
        output: '@scss/base/_fonts.scss',
      },
    }),
  ],
});
```

## Структура проекта

```
project/
├── plugins/                          # Vite плагины
│   ├── vite-plugin-fonts-converter/
│   └── icons-pipeline/
├── raw/
│   └── fonts/                        # @fonts/raw — исходные TTF
│       ├── Manrope-Regular.ttf
│       └── Manrope-Bold.ttf
├── src/
│   ├── raw/
│   │   └── icons/                    # @icons/raw — исходные SVG
│   │       ├── logo.svg
│   │       └── menu.svg
│   ├── assets/
│   │   ├── fonts/                    # @fonts — WOFF2 + кеш
│   │   │   ├── Manrope-Regular.woff2
│   │   │   ├── Manrope-Bold.woff2
│   │   │   └── .fonts-cache.json
│   │   └── icons/                    # @icons — спрайты
│   │       ├── critical-sprite.svg
│   │       └── rest-sprite.svg
│   ├── scss/
│   │   └── base/
│   │       └── _fonts.scss           # @scss/base/_fonts.scss — сгенерированный SCSS
│   └── dev/
│       └── icons.html                # @dev — dev-каталог иконок
└── vite.config.js
```

## Использование в других проектах

1. **Скопируйте папку плагина**

   ```bash
   cp -r plugins/vite-plugin-fonts-converter ./my-project/plugins/
   cp -r plugins/icons-pipeline ./my-project/plugins/
   ```

2. **Настройте алиасы в `vite.config.js`**

   ```javascript
   resolve: {
     alias: {
       '@fonts/raw': path.resolve(__dirname, 'path/to/ttf'),
       '@fonts': path.resolve(__dirname, 'path/to/woff2'),
       '@icons/raw': path.resolve(__dirname, 'path/to/svg'),
       '@icons': path.resolve(__dirname, 'path/to/sprites'),
       '@scss': path.resolve(__dirname, 'path/to/scss'),
       '@dev': path.resolve(__dirname, 'path/to/dev'),
     },
   }
   ```

3. **Используйте плагины с алиасами**

   ```javascript
   plugins: [
     iconsPipelinePlugin({
       rawDir: '@icons/raw',
       outDir: '@icons',
       catalogDir: '@dev',
     }),
     fontsConverter({
       sourceDir: '@fonts/raw',
       outputDir: '@fonts',
       scss: { output: '@scss/base/_fonts.scss' },
     }),
   ]
   ```

## Обработка ошибок

### Алиас не найден

```
[vite-plugin-fonts-converter] Alias not found in config.resolve.alias: @fonts/wrong
```

**Решение:** Добавьте алиас в `resolve.alias` или исправьте название

### Относительный путь вместо алиаса

```
[icons-pipeline] Path must be an alias starting with '@', got: src/raw/icons
```

**Решение:** Используйте алиас вместо относительного пути

### Обязательные опции отсутствуют

```
[vite-plugin-fonts-converter] Both sourceDir and outputDir are required and must be aliases
```

**Решение:** Укажите обязательные опции с алиасами

## Зависимости

### vite-plugin-fonts-converter

- `fs-extra` — работа с файловой системой
- `wawoff2` — конвертация TTF в WOFF2
- `@pdf-lib/fontkit` — парсинг метаданных шрифтов
- `crypto` — хеширование для кеша

### icons-pipeline

- `svgo` — оптимизация SVG
- `fs` (node:fs) — работа с файловой системой
- `path` (node:path) — работа с путями

## Разработка

### Dev режим

```bash
npm run dev
```

- Плагины отслеживают изменения в исходных файлах
- Автоматический HMR (CSS reload для шрифтов, full reload для иконок)
- Dev-каталог иконок доступен по `/dev/icons.html`

### Production сборка

```bash
npm run build
```

- Конвертация всех шрифтов
- Сборка всех спрайтов
- Critical спрайт инлайнится в HTML
- Rest спрайт копируется в `dist/assets/icons/`
