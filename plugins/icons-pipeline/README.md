# icons-pipeline

SVG-спрайты с разделением на critical (inline) и rest (lazy load).

## Возможности

- Оптимизация SVG через SVGO
- Critical спрайт — inline в HTML
- Rest спрайт — lazy load
- Dev-каталог с превью
- HMR в dev режиме
- Работа через алиасы Vite

## Использование

```js
// vite.config.js
import { iconsPipelinePlugin } from './plugins/icons-pipeline/index.js';

export default defineConfig({
  resolve: {
    alias: {
      '@icons/raw': path.resolve(__dirname, 'src/raw/icons'),
      '@icons': path.resolve(__dirname, 'src/assets/icons'),
      '@dev': path.resolve(__dirname, 'src/dev'),
    },
  },
  plugins: [
    iconsPipelinePlugin({
      rawDir: '@icons/raw',
      outDir: '@icons',
      catalogDir: '@dev',
      rules: {
        critical: ['logo', 'menu', 'close'],
      },
    }),
  ],
});
```

## Опции

| Опция | Тип | По умолчанию | Описание |
|-------|-----|--------------|----------|
| `rawDir` | `string` | — | Алиас к исходным SVG (обязательно) |
| `outDir` | `string` | — | Алиас к спрайтам (обязательно) |
| `catalogDir` | `string` | — | Алиас для dev-каталога |
| `rules.critical` | `string[]` | `[]` | Имена critical иконок (без `.svg`) |
| `debounceMs` | `number` | `50` | Задержка пересборки |

## Структура

```
src/raw/icons/       ← rawDir (исходные SVG)
  logo.svg
  arrow.svg

src/assets/icons/    ← outDir (спрайты)
  critical-sprite.svg
  rest-sprite.svg

src/dev/
  icons.html         ← catalogDir (dev-каталог)
```

## HTML

**Critical** — встраивается в `<body>` автоматически:

```html
<svg class="icon"><use href="#logo"></use></svg>
```

**Rest** — после загрузки `rest-sprite.svg`:

```html
<svg class="icon"><use href="#arrow"></use></svg>
```

При наличии rest-спрайта на `<body>` добавляется `data-rest-sprite="1"`.

## Production

- `critical-sprite.svg` → inline в HTML
- `rest-sprite.svg` → `dist/assets/icons/`
- Dev-каталог не включается

## Ограничения

- Пути — только алиасы (`@...`)
- Только простые SVG (`<path>` с fill/stroke)
- Плоская структура (без поддиректорий)
- Сложные SVG (градиенты, маски, `<defs>`) — используйте inline

## Зависимости

```json
{
  "svgo": "^3.3.0",
  "svg-path-bounding-box": "^1.0.0",
  "fast-xml-parser": "^4.0.0"
}
```
