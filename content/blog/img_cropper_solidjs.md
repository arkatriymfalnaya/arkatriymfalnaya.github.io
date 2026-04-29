---
title: image cropper на solidjs
description:
keywords: javascript frontend solidjs tutorial
date: 2026-03-24
tags: ["frontend", "tutorial", "solidjs", "webdev"]
---

иногда кажется, что кроп изображения — это просто ui-компонент: выделил область, обрезал, сохранил.

но когда ты начинаешь делать это руками через canvas, drag’n’drop и пересчёт координат с учётом scale — внезапно получается маленький графический редактор.

в этой статье — разбор image cropper, который я собрал на solidjs: от canvas-рендера до экспорта файла.

---

## контекст

задача была простой на словах:

- загрузить изображение
- дать пользователю выбрать область
- добавить зум
- сохранить результат как файл

но почти сразу стало понятно, что это не dom-задача, а работа с пикселями.

---

## сам компонент

это основной компонент кроппера. он держит всё состояние внутри: canvas, drag, scale, загрузку и экспорт.

```ts
import { UploadFile } from "@solid-primitives/upload";
import { clsx } from "clsx";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { useLocalize } from "~/context/localize";
import { Button } from "../Button";

import styles from "./ImageCropper.module.scss";

interface CropperProps {
	uploadFile: UploadFile;
	onSave: (arg0: any) => void;
	onDecline?: () => void;
}

export const ImageCropper = (props: CropperProps) => {
	let canvasRef: HTMLCanvasElement | undefined;
	let imageRef: HTMLImageElement | undefined;
	let containerRef: HTMLDivElement | undefined;

	const { t } = useLocalize();

	const [isLoading, setIsLoading] = createSignal(false);
	const [cropData, setCropData] = createSignal({
		x: 0,
		y: 0,
		width: 200,
		height: 200,
	});

	const [isDragging, setIsDragging] = createSignal(false);
	const [dragStart, setDragStart] = createSignal({ x: 0, y: 0 });
	const [imageLoaded, setImageLoaded] = createSignal(false);
	const [scale, setScale] = createSignal(1);

	// логика ниже
};
```

---

## стили: это уже не просто ui

```css
.cropperContainer {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1rem;
	padding: 1rem;
	background: var(--black-50);
	border-radius: var(--comment-radius-md);
}
```

идея простая:

- центрированная рабочая зона
- ощущение инструмента, а не формы
- минимум отвлекающего ui

---

## canvas как рабочая поверхность

```css
.cropperCanvas {
	display: flex;
	justify-content: center;
	align-items: center;
	background: var(--background-color);
	border-radius: var(--border-radius);
	padding: 10px;
	box-shadow: 0 2px 8px var(--shadow-color-medium);
}
```

canvas визуально отделён — как холст в редакторе.

---

## grab vs dragging

```css
.cropperCanvas canvas {
	cursor: grab;
}

.cropperCanvas canvas.dragging {
	cursor: grabbing;
}
```

---

## zoom контролы

```css
.zoomControl {
	background-color: rgba(0, 0, 0, 0.5);
	border-radius: 50%;
	width: 30px;
	height: 30px;
	font-size: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #fff;
	cursor: pointer;
}
```

---

## адаптивность

```css
@media (max-width: 768px) {
	.cropperContainer {
		padding: 0.5rem;
	}

	.cropperCanvas canvas {
		max-width: calc(100vw - 2rem);
		max-height: 300px;
	}
}
```

---

## как работает рендер

```ts
const drawImage = () => {
	const ctx = canvasRef.getContext("2d");
	if (!ctx || !imageRef) return;

	const img = imageRef;
	const currentScale = scale();

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	const displayWidth = img.naturalWidth * currentScale;
	const displayHeight = img.naturalHeight * currentScale;

	const offsetX = (canvas.width - displayWidth) / 2;
	const offsetY = (canvas.height - displayHeight) / 2;

	ctx.drawImage(img, offsetX, offsetY, displayWidth, displayHeight);

	ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	const crop = cropData();
	ctx.clearRect(crop.x, crop.y, crop.width, crop.height);

	ctx.strokeStyle = "#fff";
	ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);
};
```

---

## drag логика

```ts
const handleMouseDown = (e: MouseEvent) => {
	const rect = canvasRef?.getBoundingClientRect();
	if (!rect) return;

	const x = e.clientX - rect.left;
	const y = e.clientY - rect.top;

	const crop = cropData();

	if (
		x >= crop.x &&
		x <= crop.x + crop.width &&
		y >= crop.y &&
		y <= crop.y + crop.height
	) {
		setIsDragging(true);
		setDragStart({ x: x - crop.x, y: y - crop.y });
	}
};
```

---

## перемещение области

```ts
const handleMouseMove = (e: MouseEvent) => {
	if (!isDragging() || !canvasRef) return;

	const rect = canvasRef.getBoundingClientRect();
	const x = e.clientX - rect.left;
	const y = e.clientY - rect.top;

	const drag = dragStart();

	const newX = Math.max(
		0,
		Math.min(canvasRef.width - cropData().width, x - drag.x),
	);
	const newY = Math.max(
		0,
		Math.min(canvasRef.height - cropData().height, y - drag.y),
	);

	setCropData({ ...cropData(), x: newX, y: newY });
	drawImage();
};
```

---

## экспорт кропа

```ts
const cropImage = () => {
	const crop = cropData();
	const currentScale = scale();

	const img = imageRef;

	const displayWidth = img.naturalWidth * currentScale;
	const displayHeight = img.naturalHeight * currentScale;

	const offsetX = (canvas.width - displayWidth) / 2;
	const offsetY = (canvas.height - displayHeight) / 2;

	const sourceX = (crop.x - offsetX) / currentScale;
	const sourceY = (crop.y - offsetY) / currentScale;
	const sourceWidth = crop.width / currentScale;
	const sourceHeight = crop.height / currentScale;

	const cropCanvas = document.createElement("canvas");
	cropCanvas.width = 300;
	cropCanvas.height = 300;

	const ctx = cropCanvas.getContext("2d");

	ctx.drawImage(
		img,
		sourceX,
		sourceY,
		sourceWidth,
		sourceHeight,
		0,
		0,
		300,
		300,
	);

	return cropCanvas;
};
```

---

## сохранение файла

```ts
const handleSave = () => {
	const croppedCanvas = cropImage();

	croppedCanvas.toBlob((blob) => {
		const file = new File([blob], `cropped-${props.uploadFile.name}`, {
			type: "image/png",
		});

		props.onSave(file);
	}, "image/png");
};
```

---

## итог

в итоге это не просто кроппер.

это:

- canvas-рендеринг
- ручная система координат
- drag & zoom
- экспорт в файл

и самое интересное — чем дальше ты заходишь, тем меньше это похоже на ui-компонент и тем больше на мини-редактор изображений внутри браузера.

[source code](https://github.com/discours/discoursio-webapp/tree/dev/src/components/_shared/ImageCropper)
