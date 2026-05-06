---
title: view transitions в react для агентов [перевод]
description:
keywords:
date: 2026-05-06
tags: ["computer_science", "javascript", "reactjs", "переводы"]
---

{% raw %}

вольный перевод статьи от Vercel Engineering "[React View Transitions v1.0.0](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-view-transitions/AGENTS.md)"

# view transitions в react

**версия 1.0.0**
vercel engineering
март 2026

> **примечание:**
> этот документ в первую очередь для llm и агентов, которые внедряют view transitions в react-приложениях. людям он тоже может быть полезен, но ориентирован на автоматизацию и единообразие.

---

## о чём речь

практическое руководство по плавным, нативным анимациям через react view transition api. внутри — компонент `<viewtransition>`, `addtransitiontype`, css-псевдоэлементы, анимация общих элементов, suspense-появления, переупорядочивание списков, направленная навигация и интеграция с next.js. есть пошаговый рабочий процесс, готовые css-рецепты и предупреждения о типичных ошибках.

---

анимируй переходы между состояниями ui через нативный браузерный `document.startviewtransition`. что анимировать — объявляешь через `<viewtransition>`, когда — через `starttransition` / `usedeferredvalue` / `suspense`, как — через css-классы. в неподдерживаемых браузерах анимации просто не работают — без падений.

## когда анимировать

каждый `<viewtransition>` должен передавать пространственную связь или непрерывность. если не можешь сформулировать, что именно он передаёт — не добавляй его.

внедряй **все** применимые паттерны из этого списка, именно в таком порядке:

| приоритет | паттерн                                    | что передаёт                         |
| --------- | ------------------------------------------ | ------------------------------------ |
| 1         | **общий элемент** (`name`)                 | "тот же самый объект — углубляемся"  |
| 2         | **suspense-появление**                     | "данные загружены"                   |
| 3         | **идентичность в списке** (per-item `key`) | "те же элементы, новое расположение" |
| 4         | **изменение состояния** (`enter`/`exit`)   | "что-то появилось/исчезло"           |
| 5         | **смена маршрута** (на уровне лейаута)     | "переход в новое место"              |

это порядок внедрения, а не список "выбери один". внедряй каждый паттерн, который подходит приложению. пропускай паттерн, только если у приложения нет для него сценария.

### выбор стиля анимации

| контекст                                  | анимация                                                  | почему                            |
| ----------------------------------------- | --------------------------------------------------------- | --------------------------------- |
| иерархическая навигация (список → детали) | типизированные `nav-forward` / `nav-back`                 | передаёт пространственную глубину |
| боковая навигация (между табами)          | голый `<viewtransition>` (затухание) или `default="none"` | нет глубины для передачи          |
| suspense-появление                        | строковые пропсы `enter`/`exit`                           | контент прибывает                 |
| ревалидация / фоновое обновление          | `default="none"`                                          | бесшумно — анимация не нужна      |

оставь направленные слайды для иерархической навигации (список → детали) и упорядоченных последовательностей (предыдущее/следующее фото, карусель, пагинированные результаты). для упорядоченных последовательностей направление передаёт позицию: "далее" слайдится справа, "назад" — слева. боковая/неупорядоченная навигация (между табами) **не** должна использовать направленные слайды — это ложно暗示 наличие пространственной глубины.

---

## доступность

всегда добавляй css для reduced motion в глобальную таблицу стилей:

```css
@media (prefers-reduced-motion: reduce) {
	::view-transition-old(*),
	::view-transition-new(*),
	::view-transition-group(*) {
		animation-duration: 0s !important;
		animation-delay: 0s !important;
	}
}
```

---

## готовность

- **next.js:** **не** устанавливай `react@canary` — app router уже включает react canary внутри. `viewtransition` работает из коробки. `npm ls react` может показывать стабильную версию — это нормально.
- **без next.js:** установи `react@canary react-dom@canary` (`viewtransition` нет в стабильном react).
- поддержка браузеров: chromium 111+, firefox 144+, safari 18.2+. плавная деградация.

---

## основные концепции

### компонент `<viewtransition>`

```jsx
import { viewtransition } from "react";

<viewtransition>
	<component />
</viewtransition>;
```

react автоматически присваивает уникальный `view-transition-name` и вызывает `document.startviewtransition` под капотом. никогда не вызывай `startviewtransition` сам.

### триггеры анимации

| триггер    | когда срабатывает                                                                     |
| ---------- | ------------------------------------------------------------------------------------- |
| **enter**  | vt впервые вставляется во время перехода                                              |
| **exit**   | vt впервые удаляется во время перехода                                                |
| **update** | dom-мутации внутри vt. с вложенными vt, мутация применяется к самому вложенному       |
| **share**  | именованный vt размонтируется, а другой с тем же `name` монтируется в том же переходе |

только `starttransition`, `usedeferredvalue` или `suspense` активируют vt. обычный `setstate` анимацию не запускает.

### критическое правило размещения

vt активирует enter/exit только если он находится **перед любыми dom-узлами**:

```jsx
// работает
<viewtransition enter="auto" exit="auto"><div>контент</div></viewtransition>

// сломано — div оборачивает vt
<div><viewtransition enter="auto" exit="auto"><div>контент</div></viewtransition></div>
```

---

## стилизация через классы view transition

значения: `"auto"` (браузерное кросc-затухание), `"none"` (отключено), `"class-name"` (кастомный css), или `{ [type]: value }` для анимаций по типам.

```jsx
<viewtransition
	default="none"
	enter="slide-in"
	exit="slide-out"
	share="morph"
/>
```

если `default` = `"none"`, все триггеры выключены, если явно не перечислены.

### css-псевдоэлементы

- `::view-transition-old(.class)` — уходящий снимок
- `::view-transition-new(.class)` — прибывающий снимок
- `::view-transition-group(.class)` — контейнер
- `::view-transition-image-pair(.class)` — пара старого и нового

---

## типы переходов

помечай переходы через `addtransitiontype`, чтобы vt могли выбирать разные анимации. вызывай несколько раз для накопления типов — разные vt в дереве реагируют на разные типы:

```jsx
starttransition(() => {
	addtransitiontype("nav-forward");
	addtransitiontype("select-item");
	router.push("/detail/1");
});
```

сопоставляй типы с css-классами. работает для `enter`, `exit` **и** `share`:

```jsx
<viewtransition
	enter={{
		"nav-forward": "slide-from-right",
		"nav-back": "slide-from-left",
		default: "none",
	}}
	exit={{
		"nav-forward": "slide-to-left",
		"nav-back": "slide-to-right",
		default: "none",
	}}
	share={{
		"nav-forward": "morph-forward",
		"nav-back": "morph-back",
		default: "morph",
	}}
	default="none"
>
	<page />
</viewtransition>
```

`enter` и `exit` не обязаны быть симметричными. например, затухание при появлении, но направленный слайд при исчезновении:

```jsx
<viewtransition
  enter={{ 'nav-forward': 'fade-in', 'nav-back': 'fade-in', default: 'none' }}
  exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
  default="none"
>
```

**typescript:** `viewtransitionclasspertype` требует ключ `default`.

### `router.back()` и кнопка "назад" в браузере

`router.back()` и кнопки назад/вперёд браузера **не** запускают view transitions (`popstate` синхронен, несовместим с `startviewtransition`). используй `router.push()` с явным url.

### типы и suspense

типы доступны во время навигации, но **не** во время последующих suspense-появлений (это отдельные переходы, без типов). используй типизированные карты для enter/exit на уровне страниц; для suspense-появлений используй простые строковые пропсы.

---

## анимация общих элементов (shared element)

одинаковый `name` на двух vt — один размонтируется, другой монтируется — создаёт морфинг общего элемента:

```jsx
<viewtransition name="hero-image">
  <img src="/thumb.jpg" onclick={() => starttransition(() => onselect())} />
</viewtransition>

// другое представление — тот же name
<viewtransition name="hero-image">
  <img src="/full.jpg" />
</viewtransition>
```

- только один vt с данным `name` может быть смонтирован одновременно — используй уникальные имена. следи за переиспользуемыми компонентами: если компонент с именованным vt рендерится и в модалке/поповере, **и** на странице, оба монтируются одновременно и ломают морфинг. либо сделай имя условным (через пропс), либо вынеси именованный vt из общего компонента в конкретного потребителя.
- `share` имеет приоритет над `enter`/`exit`. продумай каждый путь навигации: когда пара не образуется, срабатывает `enter`/`exit`. подумай, нужна ли элементу fallback-анимация для таких путей.
- никогда не используй fade-out exit на страницах с общими морфингами — используй направленный слайд.

---

## общие паттерны

### enter/exit

```jsx
{
	show && (
		<viewtransition enter="fade-in" exit="fade-out">
			<panel />
		</viewtransition>
	);
}
```

### переупорядочивание списка

```jsx
{
	items.map((item) => (
		<viewtransition key={item.id}>
			<itemcard item={item} />
		</viewtransition>
	));
}
```

запускай внутри `starttransition`. избегай оборачивающих `<div>` между списком и vt.

### композиция общих элементов с идентичностью списка

общие элементы и идентичность списка — независимые задачи, не путай одно с другим. когда элемент списка содержит общий элемент, используй две вложенные границы `<viewtransition>`:

```jsx
{
	items.map((item) => (
		<viewtransition key={item.id}>
			{" "}
			{/* идентичность списка */}
			<link href={`/items/${item.id}`}>
				<viewtransition name={`item-image-${item.id}`} share="morph">
					{" "}
					{/* общий элемент */}
					<image src={item.image} />
				</viewtransition>
				<p>{item.name}</p>
			</link>
		</viewtransition>
	));
}
```

внешний vt обрабатывает переупорядочивание/вход. внутренний vt обрабатывает морфинг общего элемента между маршрутами. отсутствие любого из слоёв означает, что анимация тихо не сработает.

### принудительный повторный вход через `key`

```jsx
<viewtransition key={searchparams.tostring()} enter="slide-up" default="none">
	<resultsgrid />
</viewtransition>
```

**осторожно:** оборачивание `<suspense>` с key перемонтирует границу и повторно фетчит.

### suspense fallback → контент

простое перекрёстное затухание:

```jsx
<viewtransition>
	<suspense fallback={<skeleton />}>
		<content />
	</suspense>
</viewtransition>
```

направленное появление:

```jsx
<suspense
	fallback={
		<viewtransition exit="slide-down">
			<skeleton />
		</viewtransition>
	}
>
	<viewtransition enter="slide-up" default="none">
		<content />
	</viewtransition>
</suspense>
```

---

## как взаимодействуют несколько vt

каждый vt, соответствующий триггеру, срабатывает одновременно в одном `document.startviewtransition`. vt в **разных** переходах не конкурируют.

### активно используй `default="none"`

без него каждый vt запускает браузерное перекрёстное затухание **при каждом** переходе. всегда используй `default="none"` и явно включай только нужные триггеры.

### два паттерна сосуществуют

**паттерн a — направленные слайды:** типизированный vt на каждой странице, срабатывает во время навигации.
**паттерн b — suspense-появления:** простые строковые пропсы, срабатывает при загрузке данных (без типа).

они сосуществуют, потому что срабатывают в разные моменты. `default="none"` на обоих предотвращает взаимные помехи. всегда сочетай `enter` с `exit`. размещай направленные vt в компонентах страниц, а не в лейаутах.

### ограничение вложенных vt

когда родительский vt выходит, вложенные в него vt **не** запускают свои enter/exit — анимируется только самый внешний vt. покадровые ступенчатые анимации элементов при смене страницы сегодня невозможны. смотри [react#36135](https://github.com/facebook/react/pull/36135) для экспериментального фикса.

---

# пошаговый процесс внедрения

**следуй этим шагам по порядку.** начни с аудита — не пропускай его. скопируй css-рецепты из раздела рецептов ниже — не пиши свои анимации.

## шаг 1: аудит приложения

прежде чем писать код, тщательно просканируй кодовую базу. найди:

- **каждый `<link>` и `router.push`** — открой каждый файл, где они есть
- **каждую границу `<suspense>`** — проверь, что рендерит её fallback
- **каждый компонент страницы/маршрута** — каждому нужно решение по размещению vt
- **постоянные элементы** (шапки, навбары, сайдбары) — им нужна изоляция через `viewtransitionname`
- **общие визуальные элементы** на обоих представлениях (источнике и цели)
- **пары скелетон → контент** — если fallback рендерит элемент управления, который также существует в реальном контенте, оба нуждаются в совпадающем `viewtransitionname`

затем классифицируй каждый переход и составь карту навигации:

```
| маршрут          | куда ведёт           | направление | паттерн vt            |
|-----------------|----------------------|-------------|-----------------------|
| /               | /detail/[id]         | вперёд      | направленный слайд    |
| /detail/[id]    | /                    | назад       | направленный слайд    |
| /detail/[id]    | /detail/[other]      | последоват. | направленный слайд или key+share crossfade |
| /tab/[a]        | /tab/[b]             | боковой     | key+share crossfade   |
| (suspense)      | (контент загружен)   | —           | slide-up появление    |
```

для каждого общего элемента (проп `name`) отметь, где пара образуется, а где нет — это определяет, нужен ли тебе `enter`/`exit` как fallback наряду с `share`.

## шаг 2: добавь css-рецепты

скопируй **полный** набор css-рецептов из раздела ниже в глобальную таблицу стилей. не пиши свои — рецепты уже учитывают ступенчатое время, motion blur и reduced motion.

## шаг 3: изолируй постоянные элементы

```jsx
<header style={{ viewtransitionname: "site-header" }}>...</header>
```

```css
::view-transition-group(site-header) {
	animation: none;
	z-index: 100;
}
```

для `backdrop-blur`/`backdrop-filter` используй обходной путь для backdrop-blur (описан в рецептах).

## шаг 4: добавь направленные переходы между страницами

```jsx
starttransition(() => {
	addtransitiontype("nav-forward");
	router.push("/detail/1");
});
```

оберни каждый **компонент страницы** (не лейаут) в типизированный vt:

```jsx
<viewtransition
	enter={{
		"nav-forward": "nav-forward",
		"nav-back": "nav-back",
		default: "none",
	}}
	exit={{
		"nav-forward": "nav-forward",
		"nav-back": "nav-back",
		default: "none",
	}}
	default="none"
>
	<div>...контент страницы...</div>
</viewtransition>
```

вынеси в переиспользуемый компонент, чтобы каждая страница не повторяла карту типов:

```jsx
export function directionalfransition({ children }) {
	return (
		<viewtransition
			enter={{
				"nav-forward": "nav-forward",
				"nav-back": "nav-back",
				default: "none",
			}}
			exit={{
				"nav-forward": "nav-forward",
				"nav-back": "nav-back",
				default: "none",
			}}
			default="none"
		>
			{children}
		</viewtransition>
	);
}
```

**правила:** всегда сочетай `enter` с `exit`. всегда добавляй `default: "none"`. размещай в компонентах страниц, а не лейаутов. используй направленные слайды только для иерархической навигации или упорядоченных последовательностей (предыдущее/следующее).

## шаг 5: добавь suspense-появления

```jsx
<suspense
	fallback={
		<viewtransition exit="slide-down">
			<skeleton />
		</viewtransition>
	}
>
	<viewtransition enter="slide-up" default="none">
		<asynccontent />
	</viewtransition>
</suspense>
```

используй `default="none"` на vt контента. используй простые строковые пропсы (не карты типов) — у suspense-разрешений нет типа.

## шаг 6: добавь анимацию общих элементов

```jsx
// исходное представление
<viewtransition name={`photo-${photo.id}`} share="morph" default="none">
  <image src={photo.src} ... />
</viewtransition>

// целевое представление — тот же name
<viewtransition name={`photo-${photo.id}`} share="morph">
  <image src={photo.src} ... />
</viewtransition>
```

когда элементы списка содержат общие элементы, компонуй оба паттерна — два независимых слоя:

```jsx
{items.map(item => (
  <viewtransition key={item.id}>                                        {/* идентичность списка */}
    <link href={`/detail/${item.id}`}>
      <viewtransition name={`item-${item.id}`} share="morph" default="none">  {/* общий элемент */}
        <image src={item.image} ... />
      </viewtransition>
    </link>
  </viewtransition>
))}
```

внешний vt обрабатывает переупорядочивание/вход. внутренний vt обрабатывает морфинг общего элемента между маршрутами. отсутствие любого из слоёв означает, что анимация тихо не сработает.

**правила:** имена должны быть глобально уникальны. добавляй `default="none"` на общие элементы со стороны списка.

## шаг 7: проверь каждый путь навигации

пройдись по каждой строке карты навигации из шага 1:

- vt монтируется/размонтируется или остаётся смонтированным (тот же маршрут)?
- для именованных vt: образуется ли пара для общего элемента? если нет — предоставляет ли `enter`/`exit` fallback?
- не блокирует ли `default="none"` анимацию, которую ты на самом деле хочешь?
- постоянные элементы остаются статичными?
- suspense-появления анимируются независимо от направленных навигаций?

---

## типичные ошибки

- **голый vt без `default="none"`** — запускает перекрёстное затухание при каждом переходе
- **направленный vt в лейауте** — лейауты сохраняются, enter/exit не сработают при смене маршрута
- **fade-out exit с общими морфингами** — конфликтует с морфингом, используй направленный слайд
- **написание своих css-анимаций** — используй рецепты
- **отсутствие `default: "none"` в типизированных объектах** — typescript требует этого, fallback — `"auto"`
- **карты типов на suspense-появлениях** — у suspense-разрешений нет типа, используй строковые пропсы
- **голый `viewtransitionname` в css для запуска анимаций** — react запускает view transitions только когда компоненты `<viewtransition>` в дереве. голой `viewtransitionname` только для изоляции элементов, а не для запуска анимаций.
- **триггер `update` для навигации по тому же маршруту** — вложенные vt крадут мутацию у родителя. используй `key` + `name` + `share` вместо этого.
- **именованный vt в переиспользуемом компоненте** — если компонент с именованным vt рендерится и в модалке/поповере, **и** на странице, оба монтируются одновременно и ломают морфинг. сделай имя условным или вынеси в конкретного потребителя.
- **`router.back()` для навигации назад** — `router.back()` вызывает синхронный `popstate`, несовместимый с view transitions. используй `router.push()` с явным url.

специфичные для next.js шаги смотри в разделе про next.js ниже.

---

# паттерны и рекомендации

## поисковая сетка с `usedeferredvalue`

```tsx
"use client";

import { usedeferredvalue, usestate, viewtransition, suspense } from "react";

export default function searchablegrid({ itemspromise }) {
	const [search, setsearch] = usestate("");
	const deferredsearch = usedeferredvalue(search);

	return (
		<>
			<input
				value={search}
				onchange={(e) => setsearch(e.currenttarget.value)}
			/>
			<viewtransition>
				<suspense fallback={<gridskeleton />}>
					<itemgrid itemspromise={itemspromise} search={deferredsearch} />
				</suspense>
			</viewtransition>
		</>
	);
}
```

именованные vt на элемент в отложенных списках вызывают перекрёстное затухание при каждом нажатии клавиши. исправляется добавлением `default="none"`.

## раскрытие/схлопывание карточки с `starttransition`

```tsx
"use client";

import { usestate, useref, starttransition, viewtransition } from "react";

export default function itemgrid({ items }) {
	const [expandedid, setexpandedid] = usestate(null);
	const scrollref = useref(0);

	return expandedid ? (
		<viewtransition enter="slide-in" name={`item-${expandedid}`}>
			<itemdetail
				item={items.find((i) => i.id === expandedid)}
				onclose={() => {
					starttransition(() => {
						setexpandedid(null);
						settimeout(
							() =>
								window.scrollto({ behavior: "smooth", top: scrollref.current }),
							100,
						);
					});
				}}
			/>
		</viewtransition>
	) : (
		<div classname="grid grid-cols-3 gap-4">
			{items.map((item) => (
				<viewtransition key={item.id} name={`item-${item.id}`}>
					<itemcard
						item={item}
						onselect={() => {
							scrollref.current = window.scrolly;
							starttransition(() => setexpandedid(item.id));
						}}
					/>
				</viewtransition>
			))}
		</div>
	);
}
```

## перекрёстное затухание без перемонтирования

опусти `key` для триггера update (перекрёстное затухание) вместо exit + enter. избегает перемонтирования suspense:

```jsx
<viewtransition>
	<tabpanel tab={activetab} />
</viewtransition>
```

## изоляция элементов от родительских анимаций

постоянные элементы попадают в снимок перехода страницы. исправляется через `viewtransitionname`:

```jsx
<nav style={{ viewtransitionname: "persistent-nav" }}>{/* ... */}</nav>
```

```css
::view-transition-group(persistent-nav) {
	animation: none;
	z-index: 100;
}
```

то же для плавающих элементов (поповеры, тултипы). глобальный фикс: `::view-transition-group(*) { z-index: 100; }`

## общие элементы управления между скелетоном и контентом

дай совпадающим элементам управления одинаковый `viewtransitionname`. не ставь ручной `viewtransitionname` на корневой dom-узел внутри `<viewtransition>`.

## переиспользуемый анимированный collapse

```jsx
function animatedcollapse({ open, children }) {
	if (!open) return null;
	return (
		<viewtransition enter="expand-in" exit="collapse-out">
			{children}
		</viewtransition>
	);
}
```

## сохранение состояния через activity

```jsx
<activity mode={isvisible ? "visible" : "hidden"}>
	<viewtransition enter="slide-in" exit="slide-out">
		<sidebar />
	</viewtransition>
</activity>
```

## исключение элементов через `useoptimistic`

значения `useoptimistic` обновляются до снятия снимка, исключая их из анимации. используй для элементов управления; для анимированного контента используй зафиксированное состояние.

---

## события view transition

императивный контроль через `onenter`, `onexit`, `onupdate`, `onshare`. всегда возвращай cleanup. `onshare` имеет приоритет.

```jsx
<viewtransition
	onenter={(instance, types) => {
		const anim = instance.new.animate(
			[
				{ transform: "scale(0.8)", opacity: 0 },
				{ transform: "scale(1)", opacity: 1 },
			],
			{ duration: 300, easing: "ease-out" },
		);
		return () => anim.cancel();
	}}
>
	<component />
</viewtransition>
```

`instance`: `.old`, `.new`, `.group`, `.imagepair`, `.name`

---

## тайминги анимации

| взаимодействие           | длительность |
| ------------------------ | ------------ |
| прямое переключение      | 100–200ms    |
| переход между маршрутами | 150–250ms    |
| suspense-появление       | 200–400ms    |
| морфинг общего элемента  | 300–500ms    |

---

## устранение неполадок

**vt не активируется:** убедись, что vt находится перед любыми dom-узлами. убедись, что используется `starttransition`.

**"два vt с одинаковым именем":** имена должны быть глобально уникальны. используй id.

**`router.back()` и кнопки браузера пропускают анимацию:** используй `router.push()` с явным url.

**анимируется только обновление:** без `<suspense>` react обрабатывает замены как обновления. рендери vt условно, или оберни в `<suspense>`.

**vt в лейауте мешает vt страниц анимироваться:** вложенные vt никогда не запускают enter/exit внутри родительского vt. если твой лейаут имеет vt, оборачивающий `{children}`, enter/exit на уровне страницы тихо не сработают. удали vt из лейаута.

**ошибка ts "свойство 'default' отсутствует":** типизированные объекты требуют ключ `default`.

**backdrop-blur мерцает:** `::view-transition-old(name) { display: none }` + `::view-transition-new(name) { animation: none }`.

**теряется `border-radius`:** примени `border-radius` непосредственно к захватываемому элементу.

**пакетирование:** множественные обновления во время анимации пакуются (a→b→c→d превращается в b→d).

---

# css-рецепты анимаций

готовый css для пропсов `<viewtransition>`. скопируй в глобальную таблицу стилей.

## переменные тайминга

```css
:root {
	--duration-exit: 150ms;
	--duration-enter: 210ms;
	--duration-move: 400ms;
}
```

### общие keyframes

```css
@keyframes fade {
	from {
		filter: blur(3px);
		opacity: 0;
	}
	to {
		filter: blur(0);
		opacity: 1;
	}
}

@keyframes slide {
	from {
		translate: var(--slide-offset);
	}
	to {
		translate: 0;
	}
}

@keyframes slide-y {
	from {
		transform: translatey(var(--slide-y-offset, 10px));
	}
	to {
		transform: translatey(0);
	}
}
```

## затухание

```css
::view-transition-old(.fade-out) {
	animation: var(--duration-exit) ease-in fade reverse;
}
::view-transition-new(.fade-in) {
	animation: var(--duration-enter) ease-out var(--duration-exit) both fade;
}
```

## слайд (вертикальный)

```css
::view-transition-old(.slide-down) {
	animation:
		var(--duration-exit) ease-out both fade reverse,
		var(--duration-exit) ease-out both slide-y reverse;
}
::view-transition-new(.slide-up) {
	animation:
		var(--duration-enter) ease-in var(--duration-exit) both fade,
		var(--duration-move) ease-in both slide-y;
}
```

## направленная навигация

### подход с одним классом

```css
::view-transition-old(.nav-forward) {
	--slide-offset: -60px;
	animation:
		var(--duration-exit) ease-in both fade reverse,
		var(--duration-move) ease-in-out both slide reverse;
}
::view-transition-new(.nav-forward) {
	--slide-offset: 60px;
	animation:
		var(--duration-enter) ease-out var(--duration-exit) both fade,
		var(--duration-move) ease-in-out both slide;
}

::view-transition-old(.nav-back) {
	--slide-offset: 60px;
	animation:
		var(--duration-exit) ease-in both fade reverse,
		var(--duration-move) ease-in-out both slide reverse;
}
::view-transition-new(.nav-back) {
	--slide-offset: -60px;
	animation:
		var(--duration-enter) ease-out var(--duration-exit) both fade,
		var(--duration-move) ease-in-out both slide;
}
```

### раздельные классы enter/exit

```css
::view-transition-new(.slide-from-right) {
	--slide-offset: 60px;
	animation:
		var(--duration-enter) ease-out var(--duration-exit) both fade,
		var(--duration-move) ease-in-out both slide;
}
::view-transition-old(.slide-to-left) {
	--slide-offset: -60px;
	animation:
		var(--duration-exit) ease-in both fade reverse,
		var(--duration-move) ease-in-out both slide reverse;
}

::view-transition-new(.slide-from-left) {
	--slide-offset: -60px;
	animation:
		var(--duration-enter) ease-out var(--duration-exit) both fade,
		var(--duration-move) ease-in-out both slide;
}
::view-transition-old(.slide-to-right) {
	--slide-offset: 60px;
	animation:
		var(--duration-exit) ease-in both fade reverse,
		var(--duration-move) ease-in-out both slide reverse;
}
```

## морфинг общего элемента

```css
::view-transition-group(.morph) {
	animation-duration: var(--duration-move);
}
::view-transition-image-pair(.morph) {
	animation-name: via-blur;
}
@keyframes via-blur {
	30% {
		filter: blur(3px);
	}
}
```

**примечание:** общие элементы используют растровые снимки. для текста с существенной разницей в размере (например, `<h3>` → `<h1>`), старый снимок масштабируется, создавая видимый артефакт "призрака". используй `text-morph` для текстовых общих элементов.

## text-morph

избегает артефактов растрового масштабирования на тексте, скрывая старый снимок и показывая новый текст в полном разрешении:

```css
::view-transition-group(.text-morph) {
	animation-duration: var(--duration-move);
}
::view-transition-old(.text-morph) {
	display: none;
}
::view-transition-new(.text-morph) {
	animation: none;
	object-fit: none;
	object-position: left top;
}
```

## масштабирование

```css
::view-transition-old(.scale-out) {
	animation: var(--duration-exit) ease-in scale-down;
}
::view-transition-new(.scale-in) {
	animation: var(--duration-enter) ease-out var(--duration-exit) both scale-up;
}
@keyframes scale-down {
	from {
		transform: scale(1);
		opacity: 1;
	}
	to {
		transform: scale(0.85);
		opacity: 0;
	}
}
@keyframes scale-up {
	from {
		transform: scale(0.85);
		opacity: 0;
	}
	to {
		transform: scale(1);
		opacity: 1;
	}
}
```

## изоляция постоянных элементов

```css
::view-transition-group(persistent-nav) {
	animation: none;
	z-index: 100;
}
```

### обходной путь для backdrop-blur

```css
::view-transition-old(persistent-nav) {
	display: none;
}
::view-transition-new(persistent-nav) {
	animation: none;
}
```

## reduced motion

```css
@media (prefers-reduced-motion: reduce) {
	::view-transition-old(*),
	::view-transition-new(*),
	::view-transition-group(*) {
		animation-duration: 0s !important;
		animation-delay: 0s !important;
	}
}
```

---

# view transitions в next.js

## настройка

```js
// next.config.js
experimental: {
	viewtransition: true;
}
```

оборачивает каждый переход `<link>` в `document.startviewtransition`. используй `default="none"` для предотвращения конфликтующих анимаций. **не** устанавливай `react@canary` — app router уже включает его.

## дополнения для next.js

**после шага 2:** включи экспериментальный флаг.

**шаг 4:** используй `transitiontypes` на `<link>` (если доступно — см. примечание о доступности):

```tsx
<link href="/photo/1" transitiontypes={["nav-forward"]}>смотреть</link>
<link href="/" transitiontypes={["nav-back"]}>назад</link>
```

**после шага 6:** для динамических сегментов на том же маршруте используй паттерн `key` + `name` + `share`.

## viewtransition на уровне лейаута

не добавляй vt на уровне лейаута, оборачивающий `{children}`, если у страниц есть свои vt — вложенные vt никогда не запускают enter/exit внутри родительского vt, поэтому enter/exit на уровне страницы тихо не сработают. удали vt из лейаута полностью. голый vt в лейауте работает только если у страниц нет своих vt. лейауты сохраняются при навигации — не используй типизированные карты в лейаутах.

## проп `transitiontypes`

работает в server components, обёртка не нужна:

```tsx
<link href="/products/1" transitiontypes={["nav-forward"]}>
	смотреть
</link>
```

**доступность:** требует `experimental.viewtransition: true`. доступно в next.js 15+ canary и next.js 16+. если недоступно, используй `starttransition` + `addtransitiontype` + `router.push()`. для проверки: `grep -r "transitiontypes" node_modules/next/dist/`. оставь ручной `starttransition` для взаимодействий, не связанных со ссылками.

## `loading.tsx` как граница suspense

файлы `loading.tsx` в next.js — это неявные границы `<suspense>`. оберни скелетон в `<viewtransition exit="...">` в `loading.tsx`, а контент — в `<viewtransition enter="..." default="none">` на странице. это идиоматичный для next.js аналог явного `<suspense fallback={...}>`. те же правила: используй простые строковые пропсы (не карты типов), так как suspense-появления срабатывают без типов переходов.

## серверная фильтрация через `router.replace`

для поиска/сортировки/фильтрации, которая перерендеривается на сервере (через параметры url), используй `starttransition` + `router.replace`. vt активируются, потому что обновление внутри `starttransition`. элементы списка, обёрнутые в `<viewtransition key={item.id}>`, анимируют переупорядочивание. это серверно-компонентная альтернатива клиентскому паттерну с `usedeferredvalue`.

## двухслойный паттерн (направленный + suspense)

направленные слайды и suspense-появления сосуществуют, потому что срабатывают в разные моменты. размещай направленный vt в **компоненте страницы** (не в лейауте):

```tsx
<viewtransition
	enter={{ "nav-forward": "slide-from-right", default: "none" }}
	exit={{ "nav-forward": "slide-to-left", default: "none" }}
	default="none"
>
	<div>
		<suspense
			fallback={
				<viewtransition exit="slide-down">
					<skeleton />
				</viewtransition>
			}
		>
			<viewtransition enter="slide-up" default="none">
				<content />
			</viewtransition>
		</suspense>
	</div>
</viewtransition>
```

## общие элементы между маршрутами

```tsx
// страница списка
<link href={`/products/${product.id}`} transitiontypes={['nav-forward']}>
  <viewtransition name={`product-${product.id}`}>
    <image src={product.image} alt={product.name} width={400} height={300} />
  </viewtransition>
</link>

// страница деталей — тот же name
<viewtransition name={`product-${product.id}`}>
  <image src={product.image} alt={product.name} width={800} height={600} />
</viewtransition>
```

## переходы динамических сегментов на том же маршруте

страница остаётся смонтированной при изменении динамического сегмента — enter/exit никогда не срабатывают. используй `key` + `name` + `share`:

```tsx
<suspense fallback={<skeleton />}>
	<viewtransition
		key={slug}
		name={`collection-${slug}`}
		share="auto"
		default="none"
	>
		<content slug={slug} />
	</viewtransition>
</suspense>
```

## server components

- `<viewtransition>` работает в server и client components
- `<link transitiontypes>` работает в server components
- `addtransitiontype` и программная навигация требуют client components

{% endraw %}
