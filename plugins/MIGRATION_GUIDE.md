# Руководство по миграции плагинов в другие проекты

## Проблема: зависимость от root

**До рефакторинга:**

```javascript
// ❌ Плагин зависел от root и __dirname
export default defineConfig({
  root: './src', // Если root изменится, пути сломаются
  plugins: [
    iconsPipelinePlugin({
      rawDir: 'src/raw/icons', // Относительно config.root
      outDir: 'src/assets/icons',
    }),
  ],
});

// В плагине:
const rootDir = path.resolve(config.root, '..'); // Хрупкая логика
resolvedRawDir = path.resolve(rootDir, rawDir);
```

**Проблемы:**

- Плагин ломается при смене `root`
- Зависимость от структуры проекта (`..`, `../..`)
- Невозможно переиспользовать без модификации

## Решение: алиасы Vite

**После рефакторинга:**

```javascript
// ✅ Плагин работает через алиасы
export default defineConfig({
  root: './src', // Может быть любым
  resolve: {
    alias: {
      '@icons/raw': path.resolve(__dirname, 'src/raw/icons'),
      '@icons': path.resolve(__dirname, 'src/assets/icons'),
    },
  },
  plugins: [
    iconsPipelinePlugin({
      rawDir: '@icons/raw', // Алиас резолвится независимо от root
      outDir: '@icons',
    }),
  ],
});

// В плагине:
function resolveAlias(aliasPath, config) {
  // Резолвит алиас из config.resolve.alias
  // Возвращает абсолютный путь
}
```

**Преимущества:**

- Работает при любом `root`
- Переносим между проектами
- Явная конфигурация всех путей

## Примеры миграции

### Пример 1: Проект с root = '.'

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import path from 'node:path';
import { iconsPipelinePlugin } from './plugins/icons-pipeline/index.js';
import fontsConverter from './plugins/vite-plugin-fonts-converter/index.js';

export default defineConfig({
  root: '.', // Корень в основной директории

  resolve: {
    alias: {
      '@fonts/raw': path.resolve(__dirname, 'assets/raw/fonts'),
      '@fonts': path.resolve(__dirname, 'assets/fonts'),
      '@icons/raw': path.resolve(__dirname, 'assets/raw/icons'),
      '@icons': path.resolve(__dirname, 'assets/icons'),
      '@scss': path.resolve(__dirname, 'styles'),
      '@dev': path.resolve(__dirname, 'dev'),
    },
  },

  plugins: [
    iconsPipelinePlugin({
      rawDir: '@icons/raw',
      outDir: '@icons',
      catalogDir: '@dev',
    }),
    fontsConverter({
      sourceDir: '@fonts/raw',
      outputDir: '@fonts',
      scss: { output: '@scss/_fonts.scss' },
    }),
  ],
});
```

**Структура:**

```
project/
├── assets/
│   ├── raw/
│   │   ├── fonts/      # @fonts/raw
│   │   └── icons/      # @icons/raw
│   ├── fonts/          # @fonts
│   └── icons/          # @icons
├── styles/
│   └── _fonts.scss     # @scss/_fonts.scss
├── dev/
│   └── icons.html      # @dev
└── vite.config.js
```

### Пример 2: Проект с root = './src'

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import path from 'node:path';
import { iconsPipelinePlugin } from './plugins/icons-pipeline/index.js';
import fontsConverter from './plugins/vite-plugin-fonts-converter/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: './src', // Корень в src

  resolve: {
    alias: {
      // Пути относительно __dirname (корня проекта), а не root
      '@fonts/raw': path.resolve(__dirname, 'raw/fonts'),
      '@fonts': path.resolve(__dirname, 'src/assets/fonts'),
      '@icons/raw': path.resolve(__dirname, 'src/raw/icons'),
      '@icons': path.resolve(__dirname, 'src/assets/icons'),
      '@scss': path.resolve(__dirname, 'src/scss'),
      '@dev': path.resolve(__dirname, 'src/dev'),
    },
  },

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
  ],
});
```

**Структура:**

```
project/
├── raw/
│   └── fonts/            # @fonts/raw
├── src/                  # root
│   ├── raw/
│   │   └── icons/        # @icons/raw
│   ├── assets/
│   │   ├── fonts/        # @fonts
│   │   └── icons/        # @icons
│   ├── scss/
│   │   └── base/
│   │       └── _fonts.scss # @scss/base/_fonts.scss
│   └── dev/
│       └── icons.html    # @dev
└── vite.config.js
```

### Пример 3: Монорепо

```javascript
// packages/frontend/vite.config.js
import { defineConfig } from 'vite';
import path from 'node:path';
import { iconsPipelinePlugin } from '../../shared/plugins/icons-pipeline/index.js';
import fontsConverter from '../../shared/plugins/vite-plugin-fonts-converter/index.js';

export default defineConfig({
  root: './src',

  resolve: {
    alias: {
      '@fonts/raw': path.resolve(__dirname, '../../shared/assets/fonts'),
      '@fonts': path.resolve(__dirname, './public/fonts'),
      '@icons/raw': path.resolve(__dirname, '../../shared/assets/icons'),
      '@icons': path.resolve(__dirname, './public/icons'),
      '@scss': path.resolve(__dirname, './src/styles'),
      '@dev': path.resolve(__dirname, './dev'),
    },
  },

  plugins: [
    iconsPipelinePlugin({
      rawDir: '@icons/raw',
      outDir: '@icons',
      catalogDir: '@dev',
    }),
    fontsConverter({
      sourceDir: '@fonts/raw',
      outputDir: '@fonts',
      scss: { output: '@scss/_fonts.scss' },
    }),
  ],
});
```

**Структура:**

```
monorepo/
├── packages/
│   └── frontend/
│       ├── src/
│       │   └── styles/       # @scss
│       ├── public/
│       │   ├── fonts/        # @fonts
│       │   └── icons/        # @icons
│       ├── dev/              # @dev
│       └── vite.config.js
└── shared/
    ├── assets/
    │   ├── fonts/            # @fonts/raw
    │   └── icons/            # @icons/raw
    └── plugins/
        ├── icons-pipeline/
        └── vite-plugin-fonts-converter/
```

## Чек-лист миграции

### 1. Копирование плагинов

```bash
# Скопируйте папки плагинов
cp -r source-project/plugins/icons-pipeline ./plugins/
cp -r source-project/plugins/vite-plugin-fonts-converter ./plugins/
```

### 2. Установка зависимостей

Проверьте `package.json` исходного проекта и установите зависимости:

```json
{
  "dependencies": {
    "fs-extra": "^11.2.0",
    "wawoff2": "^3.0.0",
    "@pdf-lib/fontkit": "^1.1.1",
    "svgo": "^3.3.0"
  }
}
```

### 3. Настройка алиасов

В `vite.config.js`:

```javascript
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      // Добавьте алиасы для плагинов
      '@fonts/raw': path.resolve(__dirname, 'path/to/ttf'),
      '@fonts': path.resolve(__dirname, 'path/to/woff2'),
      '@icons/raw': path.resolve(__dirname, 'path/to/svg'),
      '@icons': path.resolve(__dirname, 'path/to/sprites'),
      '@scss': path.resolve(__dirname, 'path/to/scss'),
      '@dev': path.resolve(__dirname, 'path/to/dev'),
    },
  },
});
```

### 4. Подключение плагинов

```javascript
import { iconsPipelinePlugin } from './plugins/icons-pipeline/index.js';
import fontsConverter from './plugins/vite-plugin-fonts-converter/index.js';

export default defineConfig({
  plugins: [
    iconsPipelinePlugin({
      rawDir: '@icons/raw',
      outDir: '@icons',
      catalogDir: '@dev', // Опционально
      rules: {
        critical: ['icon1', 'icon2'], // Настройте под свой проект
      },
    }),

    fontsConverter({
      sourceDir: '@fonts/raw',
      outputDir: '@fonts',
      allowedWeights: [400, 700], // Настройте под свой проект
      allowedStyles: ['normal'],
      scss: {
        enabled: true,
        output: '@scss/_fonts.scss',
      },
    }),
  ],
});
```

### 5. Тестирование

```bash
# Dev режим
npm run dev

# Проверьте логи:
# [log] fonts: sourceDir resolved: /absolute/path/to/ttf
# [log] fonts: outputDir resolved: /absolute/path/to/woff2
# [log] [icons-pipeline] rawDir resolved: /absolute/path/to/svg
# [log] [icons-pipeline] outDir resolved: /absolute/path/to/sprites

# Production сборка
npm run build

# Проверьте dist/:
# - dist/assets/fonts/*.woff2
# - dist/assets/icons/rest-sprite.svg
# - dist/index.html (с inline critical-sprite.svg)
```

## Частые ошибки

### Ошибка 1: Использование относительных путей

```javascript
// ❌ Неправильно
fontsConverter({
  sourceDir: 'raw/fonts', // Относительный путь
  outputDir: '@fonts',
});

// Ошибка: Path must be an alias starting with '@', got: raw/fonts
```

**Решение:**

```javascript
// ✅ Правильно
resolve: {
  alias: {
    '@fonts/raw': path.resolve(__dirname, 'raw/fonts'),
  },
},
plugins: [
  fontsConverter({
    sourceDir: '@fonts/raw',  // Алиас
    outputDir: '@fonts',
  }),
]
```

### Ошибка 2: Забыли добавить алиас

```javascript
// ❌ Неправильно
plugins: [
  fontsConverter({
    sourceDir: '@fonts/custom', // Алиас не определен
    outputDir: '@fonts',
  }),
];

// Ошибка: Alias not found in config.resolve.alias: @fonts/custom
```

**Решение:**

```javascript
// ✅ Правильно
resolve: {
  alias: {
    '@fonts/custom': path.resolve(__dirname, 'path/to/custom'),
    '@fonts': path.resolve(__dirname, 'path/to/fonts'),
  },
},
plugins: [
  fontsConverter({
    sourceDir: '@fonts/custom',
    outputDir: '@fonts',
  }),
]
```

### Ошибка 3: Путь резолвится относительно root

```javascript
// ❌ Неправильно
export default defineConfig({
  root: './src',
  resolve: {
    alias: {
      // Путь резолвится относительно config.root ('src')
      '@fonts': path.resolve(config.root, 'assets/fonts'), // config не доступен здесь
    },
  },
});
```

**Решение:**

```javascript
// ✅ Правильно
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: './src',
  resolve: {
    alias: {
      // Путь резолвится относительно __dirname (корень проекта)
      '@fonts': path.resolve(__dirname, 'src/assets/fonts'),
    },
  },
});
```

## Дополнительная информация

- [vite-plugin-fonts-converter README](./vite-plugin-fonts-converter/README.md)
- [icons-pipeline README](./icons-pipeline/README.md)
- [Общий README](./README.md)
