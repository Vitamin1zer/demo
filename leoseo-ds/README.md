# LEOSEO — дизайн-система клиентских отчётов и демо

Копия стилей из проекта Claude Design «LEOSEO Design System»
(https://claude.ai/design/p/75e42f0a-70a7-40a4-99e5-889238fe0a56), собрана 16.10.2026 по брифу
`victory/eco-capital/site/other/Аналитика/2026-10 демо/ДИЗАЙН-БРИФ.md`. Источник правды — проект в Claude Design;
после правок там обновлять эту папку (токены, `components/components.css`, логотипы) и пересобирать демо.

Здесь только то, что нужно статическим страницам: токены, классы `ls-*`, логотипы. React-компоненты и карточки
гайдлайнов остаются в Claude Design.

## Что внутри

- `styles.css` — точка входа, одни `@import`.
- `tokens/fonts.css` — Manrope (заголовки, цифры) и Golos Text (текст) с Google Fonts.
- `tokens/colors.css` — единственная экранная тема тёмная; светлая палитра только для печати (`@media print`) и превью `data-theme="print"`.
- `tokens/typography.css`, `tokens/spacing.css`, `tokens/base.css` — шкала, отступы, элементы, печать; в `base.css` фоновая картинка сайта `body::before` (`bg-leoseo.webp`, плотность 18 %), отключается классом `ls-no-art`.
- `components/components.css` — классы: `ls-page`, `ls-head`, `ls-h1/h2/h3`, `ls-lead`, `ls-p`, `ls-bullets`, `ls-note`,
  `ls-quote`, `ls-conc` (вывод), `ls-fig` + `ls-legend` + `ls-chart` + `ls-tip` (графики), `ls-table` + `ls-share`,
  `ls-chg` (изменения), `ls-why` (причины), `ls-plan` + `ls-tag` (план по месяцам), `ls-fc` (прогноз), `ls-sign`, `ls-cols`;
  интерактив: `ls-card`/`ls-cards` (карточки метрика/страница/задача), `ls-seg` (сегменты), `ls-tabs`, `ls-tgl` (переключатель), `ls-range` + `ls-outs` (ползунок и выводы), `ls-acc` (аккордеон), `ls-car` (карусель), `ls-prog` (прогресс). Поведение – на странице своим JS (образец в build_demo.py).
- `assets/` — логотип для тёмного (`-light`) и светлого (`-dark`) фона, фон сайта `bg-leoseo.webp`.
- `tokens/motion.css`, `components/mechanics.css`, `assets/leo-interactions.js` — механики с сайта leoseo.ru (16.10, вторая итерация): фокус-ринг, кнопки `leo-btn` с `leo-glow`, карточки `leo-card`/`leo-sheen`/`leo-reveal`/`data-tilt`, чипы `leo-chip`, бейджи `leo-badge`, липкая шапка `leo-bar` со скролл-спаем, подсказка `leo-hint`, состояния форм `leo-input`/`leo-check`. JS подключать на страницу вместе с CSS.

Ширина контента в системе 1080 px; в демо по просьбе Леонида (16.10.2026) переопределяется на 1440 px (`--content-max`).

## Как подключать в демо

`publish.py` не пускает ссылки за пределы папки страницы, поэтому сборщик демо вшивает CSS в страницу и кладёт логотипы
рядом с ней. Образец — `victory/eco-capital/site/other/Аналитика/2026-10 демо/build_demo.py`: читает эту папку,
собирает `index.html` с классами `ls-*`, рисует графики SVG по правилам системы (столбцы от нуля, подписи у линий,
легенда при двух сериях, источник под графиком).

## Правила коротко

Один акцент на экран (медь), цвет только у данных, линии вместо теней, углы прямые, без надзаголовков и плиток с цифрами,
без эмодзи и иконок, рост и падение помечаются стрелкой, числа по-русски (пробел тысяч, `22 %`, минус `−`).
Полный текст принципов — в readme проекта Claude Design.
