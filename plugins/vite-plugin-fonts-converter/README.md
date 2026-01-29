# vite-plugin-fonts-converter

Vite-плагин для автоматической конвертации TTF шрифтов в WOFF2 с генерацией SCSS.

## Особенности

- Конвертация TTF → WOFF2
- Автоматическая генерация `@font-face` в SCSS
- Интеллектуальное кеширование (конвертация только при изменениях)
- HMR поддержка в dev режиме
- **Работа только через алиасы Vite** — нет зависимости от `root` или `__dirname`

## Установка

Плагин находится в директории проекта. Скопируйте папку `vite-plugin-fonts-converter` в свой проект.

## Использование

### 1. Настройка алиасов в `vite.config.js`

```javascript
import { defineConfig } from 'vite';
import path from 'node:path';
import fontsConverter from './plugins/vite-plugin-fonts-converter/index.js';

export default defineConfig({
  resolve: {
    alias: {
      '@fonts/raw': path.resolve(__dirname, 'raw/fonts'),    // Исходные TTF
      '@fonts': path.resolve(__dirname, 'src/assets/fonts'), // Выходные WOFF2
      '@scss': path.resolve(__dirname, 'src/scss'),          // SCSS файлы
    },
  },

  plugins: [
    fontsConverter({
      sourceDir: '@fonts/raw',                    // Алиас к TTF файлам
      outputDir: '@fonts',                        // Алиас к выходной директории
      allowedWeights: [400, 600, 700],           // Разрешенные начертания
      allowedStyles: ['normal', 'italic'],       // Разрешенные стили
      watch: true,                               // Отслеживать изменения в dev
      reloadOnChange: true,                      // HMR при изменениях
      debug: false,                              // Debug логи
      scss: {
        enabled: true,
        output: '@scss/base/_fonts.scss',        // Алиас к SCSS файлу
      },
    }),
  ],
});
```

### 2. Структура проекта

```
project/
├── raw/
│   └── fonts/              # TTF файлы (sourceDir: '@fonts/raw')
│       ├── Manrope-Regular.ttf
│       ├── Manrope-Bold.ttf
│       └── ...
├── src/
│   ├── assets/
│   │   └── fonts/          # WOFF2 файлы (outputDir: '@fonts')
│   │       ├── Manrope-Regular.woff2
│   │       ├── Manrope-Bold.woff2
│   │       └── .fonts-cache.json
│   └── scss/
│       └── base/
│           └── _fonts.scss # Сгенерированный SCSS (scss.output)
└── vite.config.js
```

### 3. Генерируемый SCSS

```scss
@font-face {
  font-family: 'Manrope';
  src: url('@fonts/Manrope-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Manrope';
  src: url('@fonts/Manrope-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
```

## API

### Опции

| Опция | Тип | Обязательно | Описание |
|-------|-----|-------------|----------|
| `sourceDir` | `string` | ✓ | Алиас к директории с TTF файлами |
| `outputDir` | `string` | ✓ | Алиас к выходной директории для WOFF2 |
| `allowedWeights` | `number[]` | - | Разрешенные font-weight (по умолчанию: `[400, 500, 600, 700]`) |
| `allowedStyles` | `string[]` | - | Разрешенные font-style (по умолчанию: `['normal']`) |
| `watch` | `boolean` | - | Отслеживать изменения в dev режиме (по умолчанию: `true`) |
| `reloadOnChange` | `boolean` | - | HMR при изменениях (по умолчанию: `true`) |
| `debug` | `boolean` | - | Вывод debug логов (по умолчанию: `false`) |
| `scss` | `object \| false` | - | Настройки генерации SCSS |
| `scss.enabled` | `boolean` | - | Включить генерацию SCSS (по умолчанию: `true`) |
| `scss.output` | `string` | ✓ (если enabled) | Алиас к выходному SCSS файлу |

## Примеры ошибок

### Неверный алиас

```javascript
// ❌ Ошибка: алиас не найден
fontsConverter({
  sourceDir: '@fonts/wrong', // Алиас не определен в resolve.alias
  outputDir: '@fonts',
})

// Вывод: [vite-plugin-fonts-converter] Alias not found in config.resolve.alias: @fonts/wrong
```

### Относительный путь вместо алиаса

```javascript
// ❌ Ошибка: используется относительный путь
fontsConverter({
  sourceDir: 'raw/fonts',  // Должен быть алиас, начинающийся с '@'
  outputDir: '@fonts',
})

// Вывод: [vite-plugin-fonts-converter] Path must be an alias starting with '@', got: raw/fonts
```

## Кеширование

Плагин создает файл `.fonts-cache.json` в `outputDir`, который хранит:
- Хеши исходных TTF файлов
- Метаданные сконвертированных шрифтов
- Список сгенерированных WOFF2 файлов

При изменении TTF файла пересоздается только измененный шрифт, остальные используются из кеша.

## Переносимость

Плагин полностью переносим между проектами:
1. Скопируйте папку плагина
2. Настройте алиасы в `resolve.alias`
3. Используйте эти алиасы в опциях плагина

**Нет зависимости от:**
- `__dirname` или `import.meta.url`
- Структуры проекта
- Значения `root` в Vite конфиге
