---
title: разбираемся с байткодом v8 [перевод]
description:
date: 2023-04-24
tags: ["computer_science", "browsers", "переводы"]
---

Вольный перевод статьи Franziska Hinkelmann "[Understanding V8’s Bytecode](https://medium.com/dailyjs/understanding-v8s-bytecode-317d46c94775)"

# Разбираемся с байткодом V8

V8 - это опенсорсный движок для JavaScript, разработанный Google. Chrome, Node.js и многие другие приложения используют V8. В этой статье будет предложено объяснение формата байткода V8, который, на самом деле, станет очень простым для чтения, как только вы поймете некоторые основные концепты.

![https://miro.medium.com/max/450/1*g8Tutq52nx6x44ELgz_UWg.png](https://miro.medium.com/max/450/1*g8Tutq52nx6x44ELgz_UWg.png)

Ignition, lift-off! Интерпретатор Ignition является частью пайплайна компилятора с 2016-го года.

Когда V8 компилирует JavaScript код, парсер генерирует абстрактное синтаксическое дерево. Синтаксическое дерево - это древовидное представление синтаксической структуры JavaScript кода, из которого интерпретатор Ignition генерирует байткод. TurboFan - это оптимизирующий компилятор, который берет байткод и генерирует из него оптимизированный машинный код.

![https://miro.medium.com/max/1019/1*ZIH_wjqDfZn6NRKsDi9mvA.png](https://miro.medium.com/max/1019/1*ZIH_wjqDfZn6NRKsDi9mvA.png)

Пайплайн компилятора V8

Если хотите узнать, для чего нам нужно именно два режима выполнения, можете посмотреть мое видео с конференции JSConfEU:

video: [https://www.youtube.com/watch?v=p-iiEDtpy6I&feature=emb_logo](https://www.youtube.com/watch?v=p-iiEDtpy6I&feature=emb_logo)

**Bytecode является абстракцией машинного кода**. Компилировать байткод в машинный код будет проще, если байткод был спроектирован с одинаковой вычислительной моделью, что и физический CPU. Поэтому интерпретаторы обычно являются регистровыми или стэковыми машинами. **Ignition - регистровая машина с аккумулятором (регистром процессора).**

![https://miro.medium.com/max/995/1*aal_1sevnb-4UaX8AvUQCg.png](https://miro.medium.com/max/995/1*aal_1sevnb-4UaX8AvUQCg.png)

**Байткоды V8 можно рассматривать как маленькие строительные блоки,** которые выстраивают любую JavaScript функциональность, когда складываются вместе. V8 имеет несколько сотен байткодов. Есть байткоды для операций, вроде `Add` и `TypeOf`, или для загрузки свойств, вроде `LdaNamedProperty`. V8 также имеет несколько специфичных байткодов, вроде `CreateObjectLiteral` и `SuspendGenerator`. Головной файл [bytecodes.h](https://github.com/v8/v8/blob/master/src/interpreter/bytecodes.h) определяет полный их список.

Каждый bytecode определяет входные и выходные данные как операнды регистра. Ignition использует геристры `r0, r1, r2, ...` и аккумулятор, который также используют почти все байткоды. Он похож на обычный регистр, но байткоды его не определяют его точно. Например, `Add r1` добавляет значение регистра `r1` к значению в аккумуляторе, что позволяет сохранять память и хранить байткоды в более коротком виде.

Множество байткодов начинается с `Lda` или `Sta`. **`a`** в выражении `Ld**a**` и `St**a**` обозначает **a**ккумулятор. Например, `LdaSmi [42]` подгружает маленькое целое число (Small Integer - Smi) `42` в регистр аккумулятора. `Star r0` будет хранить текущее значение регистра `r0`.

Пора взглянуть на байткод реальной функции.

    function incrementX(obj) {
      return 1 + obj.x;
    }

    incrementX({x: 42});  // Компилятор V8 ленив. Если вы не запустите функцию - он ее не интерпретирует.

> Если вы хотите посмотреть на байткод V8 в JavaScript коде, то исполните команду с флагом --print-bytecode (для D8 и Node.js версии 8.3 и выше). Для Chrome вам нужно запустить его из командной строки с флагом --js-flags="--print-bytecode", см. [Запуск Chromium с флагами](https://www.chromium.org/developers/how-tos/run-chromium-with-flags).

    $ node --print-bytecode incrementX.js
    ...
    [generating bytecode for function: incrementX]
    Parameter count 2
    Frame size 8
      12 E> 0x2ddf8802cf6e @    StackCheck
      19 S> 0x2ddf8802cf6f @    LdaSmi [1]
            0x2ddf8802cf71 @    Star r0
      34 E> 0x2ddf8802cf73 @    LdaNamedProperty a0, [0], [4]
      28 E> 0x2ddf8802cf77 @    Add r0, [6]
      36 S> 0x2ddf8802cf7a @    Return
    Constant pool (size = 1)
    0x2ddf8802cf21: [FixedArray] in OldSpace
     - map = 0x2ddfb2d02309 <Map(HOLEY_ELEMENTS)>
     - length: 1
               0: 0x2ddf8db91611 <String[1]: x>
    Handler Table (size = 16)

Большую часть вывода можно игнорировать и фокусироваться только на самих байткодах. Ниже описано шаг за шагом, что значит каждый байткод.

# **LdaSmi [1]**

`LdaSmi [1]` загружает постоянное значение `1` в аккумулятор.

![https://miro.medium.com/max/311/1*WIECS2Gd701BnheqXrWbag.png](https://miro.medium.com/max/311/1*WIECS2Gd701BnheqXrWbag.png)

# **Star r0**

Далее, `Star r0`  в регистре `r0` хранит значение, которое на момент находится в аккумуляторе (`1`).

![https://miro.medium.com/max/311/1*271aYN7VC6ltaleyDfwhXg.png](https://miro.medium.com/max/311/1*271aYN7VC6ltaleyDfwhXg.png)

# **`LdaNamedProperty a0, [0], [4]`**

`LdaNamedProperty` загружает именованное свойство `a0` в аккумулятор. `ai` ссылается на i-ый аргумент `incrementX()`. В этом примере мы ищем именованное свойство в `a0`, первый аргумент `incrementX()`. Имя определяется константой  `0`. `LdaNamedProperty` использует `0` для нахождения имени в отдельной таблице:

    - length: 1
               0: 0x2ddf8db91611 <String[1]: x>

Here, `0` отображает значение `x`, потому этот байткод загружает `obj.x`.

Для чего используется операнд со значением `4`? Это индекс так называемого _вектора обратной связи_ функции `incrementX()`, которые содержит нужную для оптимизаций производительности рантайм информацию.

Теперь регистры выглядят так:

![https://miro.medium.com/max/311/1*sGFN376VKgf2hWXctBqZnw.png](https://miro.medium.com/max/311/1*sGFN376VKgf2hWXctBqZnw.png)

# **Add r0, [6]**

Последняя инструкция добавляет `r0` в аккумулятор, возвращая в результате `43`. `6` - это еще один индекс вектора обратной связи.

![https://miro.medium.com/max/311/1*LAHuYIvZaXX8jH_STNHfmQ.png](https://miro.medium.com/max/311/1*LAHuYIvZaXX8jH_STNHfmQ.png)

# **Return**

`Return` возвращает значение аккумулятора. Это конец функции `incrementX()`. Вызывающий функцию  `incrementX()` операнд получает значение `43` из аккумулятора и может начать работать с ним.

На первый взгляд, байткод V8 может показаться какой-то загадкой, особенно со всей остальной информацией в выводе. Но как только вы поймете что Ignition это регистровая машина с аккумулятором регистра, вы сможете понять за что отвечает большинство байткодов.

![https://miro.medium.com/max/1024/1*ZrJKJqBsksWd-8uKM9OvgA.png](https://miro.medium.com/max/1024/1*ZrJKJqBsksWd-8uKM9OvgA.png)

> Примечание: в статье описывается байткод V8 версии 6.2, Chrome версии 62 и Node версии 9. Мы постоянно работаем над улучшением потребления памяти и производительности V8, потому детали в других версиях могут отличаться.
