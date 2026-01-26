


## abstracts/
Только переменные, миксины, функции.
❌ Никаких классов и селекторов.

## base/
Глобальные стили: reset, body, html, типографика.

## layout/
Структура страницы:
– header
– footer
– navigation (offcanvas, menu)
– sections (ТОЛЬКО layout, без декора)

## components/
Переиспользуемые UI-компоненты:
– button
– card
– form
– burger



## Rules

❌ Компоненты не знают о layout
❌ Layout не красит кнопки
❌ Sections.scss не превращается в помойку

✅ Меню = layout
✅ Кнопка = component
✅ Fixed / sticky UI — отдельный слой


## Naming

– файл = одна ответственность
– имя по смыслу, не по библиотеке

❌ slideout.scss
✅ navigation.scss / offcanvas.scss



### Где писать стили мобильного меню
layout/_navigation.scss

### Где писать кнопку бургера
components/_burger.scss


# SCSS Architecture Rules

Цель:
– не допустить свалки в стилях
– сохранить масштабируемость
– чётко разделять ответственность

Если сомневаешься, куда писать стиль — смотри сюда.

---

## Общий принцип

**Layout ≠ Component**

- layout — структура страницы
- component — переиспользуемый UI
- abstracts — логика, без CSS
- base — глобальные правила

Файл = одна ответственность.

---

## Папки и правила

### abstracts/
Только вспомогательные сущности.

Разрешено:
- variables
- mixins
- functions
- breakpoints

Запрещено:
- классы
- селекторы
- реальные стили

```scss
// OK
$color-black: #0e0f12;

// ❌ НЕ ОК
.button { ... }

