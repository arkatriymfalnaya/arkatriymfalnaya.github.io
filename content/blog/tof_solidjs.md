---
title: плавающее оглавление на solidjs
description:
keywords: javascript frontend solidjs tutorial
date: 2026-03-24
tags: ["frontend", "tutorial", "typescript", "solidjs", "webdev"]
---

иногда плавающее оглавление кажется довольно простой штукой: берёшь заголовки, рисуешь список, добавляешь якоря — готово.

в этой статье — разбор table of contents, который я собрал на solidjs: от поиска заголовков до sticky/fixed поведения и адаптивного ui.

---

## контекст

задача :

- собрать список заголовков статьи
- сделать быстрые переходы по клику
- подсвечивать текущий раздел при скролле
- поддерживать мобильный и десктопный режим
- уметь скрываться и появляться

---

## сбор заголовков из документа

вся система начинается с обхода dom и поиска заголовков внутри контейнера статьи.

```ts
const updateHeadings = () => {
	const parent = document.querySelector(props.parentSelector);

	if (!parent) return;

	const nodes = Array.from(
		parent.querySelectorAll<HTMLElement>("h1, h2, h3, h4"),
	);

	setHeadings(nodes);
	setAreHeadingsLoaded(true);
};
```

по сути это “снимок структуры документа”.

---

## debounce пересборки оглавления

чтобы не пересобирать список слишком часто:

```ts
const debouncedUpdateHeadings = debounce(500, updateHeadings);
```

это особенно важно, если контент может динамически изменяться.

---

## определение активного заголовка

самая “живая” часть компонента — отслеживание скролла.

```ts
const isInViewport = (el: HTMLElement) => {
	const rect = el.getBoundingClientRect();

	return rect.top <= DEFAULT_HEADER_OFFSET + 24;
};
```

и дальше поиск активного элемента:

```ts
const updateActiveHeader = throttle(50, () => {
	const index = headings().findIndex((h) => isInViewport(h));

	setActiveHeaderIndex(index);
});
```

---

## переход к заголовку

при клике происходит ручной scroll с компенсацией fixed header’а:

```ts
const scrollToHeader = (element: HTMLElement) => {
	const top =
		element.getBoundingClientRect().top -
		document.body.getBoundingClientRect().top -
		DEFAULT_HEADER_OFFSET;

	window.scrollTo({
		top,
		behavior: "smooth",
	});
};
```

---

## состояние компонента

оглавление держит сразу несколько слоёв состояния:

```ts
const [headings, setHeadings] = createSignal<HTMLElement[]>([]);
const [activeHeaderIndex, setActiveHeaderIndex] = createSignal(-1);
const [isVisible, setIsVisible] = createSignal(true);
const [areHeadingsLoaded, setAreHeadingsLoaded] = createSignal(false);
const [isDocumentReady, setIsDocumentReady] = createSignal(false);
```

---

## подписка на скролл

основная реактивность строится через window scroll:

```ts
onMount(() => {
	setIsDocumentReady(true);

	debouncedUpdateHeadings();

	window.addEventListener("scroll", updateActiveHeader);

	onCleanup(() => {
		window.removeEventListener("scroll", updateActiveHeader);
	});
});
```

---

## реакция на изменение статьи

если меняется тело статьи — пересобираем структуру:

```ts
createEffect(
	on(
		() => props.body,
		() => {
			if (isDocumentReady()) {
				debouncedUpdateHeadings();
			}
		},
	),
);
```

---

## рендер списка

основной ui — это список кнопок, привязанных к заголовкам.

```tsx
<ul class={styles.TableOfContentsHeadingsList}>
	<For each={headings()}>
		{(h, index) => (
			<li>
				<button
					class={clsx(styles.TableOfContentsHeadingsItem, {
						[styles.TableOfContentsHeadingsItemH3]: h.nodeName === "H3",
						[styles.TableOfContentsHeadingsItemH4]: h.nodeName === "H4",
						[styles.active]: index() === activeHeaderIndex(),
					})}
					innerHTML={h.textContent || ""}
					onClick={(e) => {
						e.preventDefault();
						scrollToHeader(h);
					}}
				/>
			</li>
		)}
	</For>
</ul>
```

---

## визуальная иерархия заголовков

уровни заголовков просто сдвигаются визуально:

```css
.TableOfContentsHeadingsItemH3 {
	padding-left: 8px;
}

.TableOfContentsHeadingsItemH4 {
	padding-left: 16px;
}
```

---

## активный пункт

подсветка текущего раздела минимальная, но важная:

```css
.TableOfContentsHeadingsItem.active {
	font-weight: 700 !important;
}
```

---

## sticky поведение на десктопе

на больших экранах оглавление становится sticky-блоком:

```css
.TableOfContentsContainer {
	@include media-breakpoint-up(xl) {
		position: sticky;
		top: 100px;
		height: calc(100vh - 120px);
		flex-direction: column;
	}
}
```

---

## mobile режим (fixed bottom panel)

на мобильных это уже не sidebar, а выезжающая панель:

```css
.TableOfContentsFixedWrapper {
	@include media-breakpoint-down(xl) {
		position: fixed;
		bottom: 0;
		left: 0;
		width: 100%;
		max-height: 50vh;
		background: #000;
		color: #fff;
	}
}
```

---

## toggle видимости

оглавление можно скрывать и показывать:

```ts
const toggleIsVisible = () => {
	setIsVisible((v) => !v);
};
```

---

## итог

в итоге это не просто оглавление.

это:

- парсинг DOM структуры статьи
- debounce пересборки контента
- scroll tracking с throttle
- вычисление активного раздела
- sticky + fixed адаптивный layout
- UI, который живёт вместе со скроллом

и самое интересное — такие компоненты всегда выглядят простыми в начале, но постепенно превращаются в полноценный слой навигации поверх документа, который “понимает” структуру текста и помогает по нему двигаться.

[source code](https://github.com/discours/discoursio-webapp/tree/dev/src/components/_shared/TableOfContents)
