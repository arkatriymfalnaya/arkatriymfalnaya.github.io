---
title: кастомный аудиоплеер на solidjs вокруг нативного audio api
description:
keywords: javascript frontend solidjs tutorial
date: 2026-01-24
tags: ["frontend", "tutorial", "typescript", "solidjs", "webdev"]
---

как я добавил в проект аудиоплеер с плейлистом, контролами и базовым управлением звуком. это не отдельный виджет, а часть страницы с текстом, поэтому он связан с контентом (заголовки, шаринг и т.д.).

---

## данные и состояние

на вход приходит массив медиа (`media`), который я сначала нормализую:

- добавляю `id`
- добавляю флаги `isCurrent` и `isPlaying`

```js
const prepareMedia = (media) =>
	media.map((item, index) => ({
		...item,
		id: index,
		isCurrent: false,
		isPlaying: false,
	}));
```

дальше всё состояние плеера живёт в этом массиве `tracks`.

текущий трек определяется через `isCurrent`. если его нет — автоматически выбирается первый.

тут есть небольшой сайд-эффект — если текущего трека нет, он выставляется прямо внутри геттера. не идеально, но в этом месте это упростило код.

---

## переключение треков и play/pause

при клике на трек или кнопку play я полностью пересобираю массив:

```js
setTracks(
	tracks().map((track) => ({
		...track,
		isCurrent: track.id === m.id,
		isPlaying: track.id === m.id ? !track.isPlaying : false,
	})),
);
```

- только один трек может быть текущим
- только один может играть

не стал выносить это в отдельный store — здесь проще пересобрать массив, чем поддерживать несколько источников состояния.

при переключении next/prev:

- считается индекс текущего трека
- выбирается следующий или предыдущий (с зацикливанием)

---

## синхронизация с `<audio>`

есть отдельный `audioRef`, который реально воспроизводит звук.

через `createEffect` я слежу за текущим треком:

```js
if (audioRef.src !== getCurrentTrack().url) {
	audioRef.src = getCurrentTrack().url;
	audioRef.load();
}
```

если трек поменялся — обновляется `src`.

---

## воспроизведение

при play:

- если контекст звука “спит” — резюмлю его
- вызываю `audioRef.play()` или `pause()`

```js
if (getCurrentTrack().isPlaying) {
	await audioRef.play();
} else {
	audioRef.pause();
}
```

---

## прогресс и время

прогресс обновляется вручную:

```js
progressFilledRef.style.width = `${(audioRef.currentTime / duration) * 100 || 0}%`;
```

- беру `currentTime` из `<audio>`
- делю на `duration`
- пишу в width

прогресс обновляется напрямую через style — это проще, чем городить отдельную реактивную прослойку.

время форматируется через `Date`:

```js
new Date(point * 1000).toISOString().slice(14, -5);
```

---

## перемотка (scrub)

при клике по прогресс-бару:

```js
audioRef.currentTime = (event.offsetX / progressRef.offsetWidth) * duration;
```

при зажатой кнопке мыши — обновляется на `mousemove`.

используется `offsetX`, что не всегда идеально, но для этого кейса оказалось достаточно.

---

## обработка событий audio

- `onTimeUpdate` → обновляю прогресс и текущее время
- `onLoadedMetadata` → получаю длительность
- `onEnded` → сбрасываю прогресс и время

---

## громкость через web audio api

я не использовал просто `audio.volume`, а сделал через `AudioContext`:

```js
const track = audioContext().createMediaElementSource(audioRef);
track.connect(gainNode()).connect(audioContext().destination);
```

и дальше:

```js
gainNode.gain.value = Number(volumeRef.value);
```

громкость управляется через `input[type=range]`.

громкость сделал через web audio api — немного оверкилл, но зато полный контроль.

с range-инпутом пришлось немного повозиться из-за разных браузеров.

---

## header (контролы)

в `PlayerHeader`:

- play / pause
- next / prev
- кнопка громкости

громкость открывается как popover:

```js
const [isVolumeBarOpened, setIsVolumeBarOpened] = createSignal(false);
```

и закрывается через кастомный хук `useOutsideClickHandler`.

---

## плейлист

в `PlayerPlaylist`:

- список треков (`<For each={tracks}>`)
- кнопка play у каждого трека
- отображение текущего состояния (play/pause иконка)

```js
getCurrentTrack().id === m.id && getCurrentTrack().isPlaying;
```

список не просто отображает данные — он тоже участвует в управлении плеером.

---

## шаринг

у каждого трека есть кнопка шаринга:

```js
<SharePopup
  title={m.title}
  description={getDescription(body)}
  imageUrl={m.pic}
  shareUrl={...}
/>
```

- используется заголовок трека
- описание берётся из текста статьи
- ссылка формируется от `articleSlug`

---

## стили

в css:

- flex layout для header и контролов
- адаптив через breakpoint
- кастомный progress bar (через `border` и `::after`)
- кастомный range input для громкости (webkit / moz / ms)

прогресс-бар и ползунок громкости полностью переопределены, дефолтные стили не используются.

---

в итоге это не отдельный плеер, а часть страницы — с текстом, шарингом и списком треков, которые живут вместе.

[source code](https://github.com/discours/discoursio-webapp/commit/a18b6b9e6d3fe6985a49f4671b81d3f3fa36fefb)
