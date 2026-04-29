---
title: очередной слайдер, которого никто не просил
description:
keywords: javascript frontend tutorial
date: 2025-02-24
tags: ["frontend", "tutorial", "typescript", "webdev"]
---

натыкаясь на вакансии от разных контор, я периодически берусь за тестовые задания, чтобы поразвлечься. в этот раз выбор пал на, кто бы сомневался, очередной слайдер. ну и пусть.

собираем проект, пара библиотек нам пригодится:

```js
npm init
yarn add path express pug path
yarn add --dev nodemon
```

сразу добавим `dev` скрипт в `package.json`, который будет стучаться к нашему сервер-скрипту:

```js
"scripts": {
    "dev": "nodemon src/server.js"
}
```

создадим папку `src` и файл `server.js`, в котором опишем наш сервер и движок для pug шаблонов:

```js
const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const port = "8000";

app.listen(port, () => {
	console.log(`Listening on http://localhost:${port}`);
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_, res) => {
	try {
		let paths = fs.readdirSync(path.join(__dirname + "/public/images/")); // там будут храниться наши картинки для слайд-шоу
		let combinedPaths = paths.map((p) => `images/${p}`);

		res.render("index", {
			imagesPaths: combinedPaths,
		});
	} catch (err) {
		throw err;
	}
});
```

самое время набросать разметку. одна центрирующая обертка, одна секция самого слайдера, контролы и сами слайды, которые отдаются серверным скриптом:

```html
doctype html html(lang='en') head meta(charset='utf-8') link(rel='stylesheet'
href='styles/index.css') meta(name='viewport', content='width=device-width,
initial-scale=1, shrink-to-fit=no') body main.wrapper section.slider each src in
imagesPaths article.slider__item.slider__item--appear.slide figure img(src=src
alt='pic') section.slider__controls button button script(type='module'
src='scripts/index.js')
```

переходим к самому вкусному - к интерактивности, которую возьмет на себя скрипт `scripts/index.js`. сперва обезопасим себя и дождемся загрузки DOM дерева:

```js
document.addEventListener('DOMContentLoaded', () => {
  …
}, false)
```

вытащим из дерева нужные ноды, объявим переменные для интервала и учёта текущего индекса слайда:

```js
const slidesList = document.querySelectorAll(".slider__item");
const controlsList = document.querySelector(".slider__controls").children;
const leftControl = controlsList[0];
const rightControl = controlsList[1]; // больше двух детей не предполагается

let interval = null;
let currentIndex = 1;
```

в конце скрипта инициализируем события и рендеринг самого слайдера:

```js
document.addEventListener("keydown", (e) => {
	if (e.key === "ArrowLeft") moveSlider("left"); // переключение левой стрелкой
	if (e.key === "ArrowRight") moveSlider("right"); // переключение правой стрелкой
	if (e.key === " " && e.target.nodeName !== "BUTTON") {
		if (interval) {
			stopSliding(); // остановка на текущем слайде по нажатию на пробел
		} else {
			proceedSliding(); // продолжение слайд-шоу, если была остановка
		}
	}
});
leftControl.addEventListener("click", () => moveSlider("left"), false);
rightControl.addEventListener("click", () => moveSlider("right"), false);

initSlider(slidesList);
```

столько функций еще не написано! надо исправлять:

```js
const initSlider = slides => {
    if (currentIndex > slides.length) currentIndex = 1
    if (currentIndex < 1) currentIndex = slides.length

    updateSlider(slidesList)
}

const moveSlider = to => {
    if (to === 'right') updateCurrentIndex('right')
    else updateCurrentIndex('left')

    initSlider(slidesList)
}

…

const stopSliding = () => {
    clearInterval(interval)
    interval = null // очищаем интервал, чтобы остановить слайд-шоу

    slidesList[currentIndex - 1].classList.add('slide--stopped')
}

const proceedSliding = () => {
    interval = setInterval(() => {
        updateCurrentIndex('right')
        initSlider(slidesList)
    }, 3000)
    slidesList[currentIndex - 1].classList.remove('slide--stopped')
}
```

многие участки дублируются, потому выносим их в отдельные хендлеры:

```js
const updateSlider = slides => {
    clearInterval(interval)

    for (let i = 0; i < slides.length; i++) {
        slides[i].classList.add('slider__item--inactive') // стили класса будут удалять слайд из разметки
        slides[i].classList.remove('slide--stopped')
    }

    slides[currentIndex - 1].classList.remove('slider__item--inactive')

    interval = setInterval(() => { // переопределяем интервал, ведь слайд-шоу не просто так шоу
        updateCurrentIndex('right')
        initSlider(slidesList)
    }, 3000)
}

…

const updateCurrentIndex = to => {
    if (to === 'right') currentIndex++
    else currentIndex--
}
```

ой, почти все! добавим стили и анимации для появления слайдов:

```css
* {
	box-sizing: border-box;
}

body,
section,
figure,
button {
	padding: 0;
	margin: 0;
}

.wrapper {
	width: 100vw;
	height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: rgba(0, 0, 0, 1);
}

.slider {
	position: relative;
	width: 100%;
	height: 540px;
}

.slider__views-counter {
	position: absolute;
	top: -28px;
	left: 0;
	margin: 0;
	margin-left: 14px;
	font-family: "Helvetica";
	font-size: 20px;
	line-height: 24px;
	color: white;
}

.slider__item {
	display: flex;
	height: 100%;
}

.slider__item--inactive {
	display: none;
}

.slider__item--appear {
	animation-name: slide-appearing;
	animation-duration: 1.5s;
}

.slide {
	align-items: center;
}

.slide--stopped {
	outline: 5px auto Highlight;
}

.slide figure {
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
}

.slide figure img {
	max-width: 100%;
	width: auto;
	max-height: 100%;
	height: auto;
}

.slider__controls {
	position: absolute;
	z-index: 2;
	top: 0;
	left: 0;
	bottom: 0;
	right: 0;
	margin: auto;
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
}

.slider__controls button {
	position: relative;
	width: 14%;
	max-width: 80px;
	height: 40%;
	border: none;
	background: transparent;
	cursor: pointer;
	border-radius: 8px;
	background-color: rgba(255, 255, 255, 0.14);
}

.slider__controls button:hover {
	background-color: rgba(255, 255, 255, 0.18);
}

.slider__controls button:active {
	box-shadow: 0px 0px 22px rgba(0, 0, 0, 0.2);
}

.slider__controls button::after {
	content: "";
	position: absolute;
	top: 0;
	left: 0;
	bottom: 0;
	right: 0;
	margin: auto;
	width: 60%;
	height: 60%;
	background-image: url(/icons/arrow.svg);
	background-size: 100% 100%;
	background-repeat: no-repeat;
	filter: invert();
}

.slider__controls button:nth-child(2)::after {
	transform: rotate(180deg);
}

@keyframes slide-appearing {
	from {
		opacity: 0.2;
	}
	to {
		opacity: 1;
	}
}

@media screen and (min-width: 1020px) {
	.slider {
		width: 80%;
		max-width: 1020px;
	}

	.slider__views-counter {
		margin-left: 0;
	}

	.slider__controls button {
		max-width: 40px;
	}
}
```

запускаем `yarn dev` и переходим по `http://localhost:8000`
