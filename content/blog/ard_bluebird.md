---
title: подключаем lcd дисплей к arduino
description:
keywords: arduino uno дисплей
date: 2026-04-17
tags: ["computer_science", "arduino"]
---

с портами дело стандартное (актуально, если к вашему дисплею уже припаян I2C/SPI конвертер):

```js
GND -> GND // земля
VCC -> 5V // питание
SDA -> A4 // линия данных
SCL -> A5 // линия синхронизации
```

и пример скрипта отображения текста:

```js
#include "Wire.h" // библиотека для протокола i2c
#include "LiquidCrystal_I2C.h" // библиотека для дисплея

LiquidCrystal_I2C lcd(0x27,16,1); // присваиваем имя дисплею

String message = "there's a bluebird in my heart that wants to get out but I'm too tough for him, I say, stay in there, I'm not going to let anybody see you. there's a bluebird in my heart that wants to get out but I pour whiskey on him and inhale cigarette smoke and the whores";

void setup() {
lcd.init();
  lcd.backlight();

  // добавляем пробелы в начале, чтобы текст выходил из-за края
  message = "                " + message;
}

void loop() {
   for (int i = 0; i < message.length() - 16; i++) {
    lcd.setCursor(0, 0); // установка курсора на 1-ю строку
    lcd.print(message.substring(i, i + 16)); // вывод 16-ти символов
    delay(100); // скорость бегущей строки
  }
}
```

**убедитесь в том, что на плате постоянное питание (не от батарейки)**
