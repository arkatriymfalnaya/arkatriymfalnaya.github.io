---
title: как конвертировать пачку изображений в webp
description:
keywords: it bash
date: 2025-09-24
tags: ["tutorial", "bash"]
---

для этого понадобится либа [cwebp](https://developers.google.com/speed/webp/docs/cwebp), которая принимает на вход степень сжатия (1..100), имя входного и выходного файлов, и простой баш цикл.
соберем все картинки в одну директорию и перейдем в нее, после чего опишем скрипт:

```
for file in *
do
cwebp -q 100 "$file" -o "${file%.png}.webp"
done
```
