.
├─ .cursor/                  # правила Cursor (architect mode, response rules)
├─ dist/                     # результат сборки (gitignore)
├─ node_modules/             # зависимости
├─ scripts/                  # node-скрипты сборки (НЕ runtime)
│  ├─ build-fonts.js
│  ├─ build-hero-sprite.js
│  ├─ generate-icons-html.js
│  ├─ optimize-images.js
│  ├─ trim-icon-svg.js
│  └─ trim-svg.js
│
├─ src/
│  ├─ assets/                # ВСЕ обрабатываемые ассеты
│  │  ├─ fonts/              # готовые шрифты (после build-fonts)
│  │  ├─ icons/
│  │  │  ├─ critical/        # SVG для первого экрана → inline sprite в HTML
│  │  │  ├─ optimized/       # оптимизированные SVG (общие)
│  │  │  └─ rest/            # SVG для JS-спрайта
│  │  ├─ img/                # растровые изображения (optimized)
│  │  └─ svg/                # НЕ иконки: bg, иллюстрации, декор
│  │
│  ├─ dev/                   # dev-only артефакты
│  │  ├─ icons.html          # страница просмотра всех иконок
│  │  └─ icons-html.css
│  │
│  ├─ js/
│  │  ├─ entry.js            # точка входа
│  │  └─ main.js
│  │
│  ├─ raw/                   # исходники, не идут в билд
│  │  ├─ fonts/
│  │  ├─ icons/
│  │  ├─ img/
│  │  └─ svg/
│  │
│  └─ scss/
│     ├─ variables.scss
│     ├─ reset.scss
│     ├─ fonts.scss
│     └─ main.scss
│
├─ static/                   # файлы без обработки (минимум!)
│  └─ index.html
│
├─ index.html                # основной HTML (vite)
├─ vite.config.js
├─ postcss.config.js
├─ package.json
├─ package-lock.json
├─ stats.html                # build-analyze (dev-only)
├─ README.md
├─ .gitignore
└─ .prettierrc.json
