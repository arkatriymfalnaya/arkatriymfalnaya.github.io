---
title: море узлов [перевод]
description:
keywords: переводы статей it
date: 2021-04-24
tags: ["computer_science", "переводы"]
---

Вольный перевод статьи Fedor Indutny "[Sea of Nodes](https://darksi.de/d.sea-of-nodes/)"

# Море Узлов

## Компиляторы **= переводчики**

Компиляторы это такая вещь, которую каждый разработчик использует несколько раз на дню. К удивлению, даже люди, совсем с кодом не знакомые, также пользуются компляторами. Это потому, что почти весь веб зависит от выполнения кода на стороне клиента и множество подобных программ передаются браузеру в виде исходного кода.

Так мы подходим к важному тезису: пока исходный код читаем человеком, он выглядит настоящим мусором для CPU вашего ноутбука/компьютера/телефона/... . С другой стороны, машинный код, который кмоптютеры **могут** читать, почти всегда нечитаем человеком. С этим нудно что-то делать, и решением является процесс под названием **перевод (translation)**.

Тривиальные компиляторы выполняют один проход перевода: от исходного кода в машинный. Однако, на практике большинство компиляторов выполняют как минимум два прохода: от исходного кода к абстрактному синтаксическому дереву ([Abstract Syntax Tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree)), и от него к машинному коду. [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree) в этом случае выступает в качестве *Промежуточного Представления* (Intermediate Representation), и, как следует из названия, является одним из форматов исходного кода. Эти промежуточные представление связаны друг с другом и, по сути, представляют собой не что иное, как уровни абстракции.

Ограничения на количество уровней нет. Каждый новый слой приближает исходную программу к тому, как она будет выглядет в машинном коде.

## Уровни оптимизации

Однако, не все слои используются для одного только перевода. Множество компиляторов также дополнительно пытаются оптимизировать рукописный код. (Который обычно пишется для баланса между элегантностью кода и его производительностью).

В качестве примера рассмотрим следующий JavaScript код:

```js
for (var i = 0, acc = 0; i < arr.length; i++) acc += arr[i];
```

Если компилятор переведет его в машинный код прямиком из [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree), то выйдет что-то вроде этого (очень абстрактно и отдаленно от реальности):

```js
    acc = 0;
    i = 0;
    loop {
      // Load `.length` field of arr
      tmp = loadArrayLength(arr);
      if (i >= tmp)
        break;

      // Check that `i` is between 0 and `arr.length`
      // (NOTE: This is necessary for fast loads and
      // stores).
      checkIndex(arr, i);

      // Load value
      acc += load(arr, i);

      // Increment index
      i += 1;
    }
```

Может быть неочевидно, но этот код далек от оптимального. Длина массива внутри цикла не изменяется, и проверять диапазон совсем не обязательно. В идеале, все должно выглядеть вот так:

```js
    acc = 0;
    i = 0;
    len = loadArrayLength(arr);
    loop {
      if (i >= tmp)
        break;

      acc += load(arr, i);
      i += 1;
    }
```

Давайте представим, как мы могли бы это сделать.

Допустим, что под рукой у нас уже есть [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree), и мы пытаемся сгенерировать из него машинный код:

_(ПРИМЕЧАНИЕ: Сгенерировано с помощью [esprima](https://github.com/jquery/esprima))_

```js
    { type: 'ForStatement',

      //
      // This is `var i = 0;`
      //
      init:
       { type: 'VariableDeclaration',
         declarations:
          [ { type: 'VariableDeclarator',
              id: { type: 'Identifier', name: 'i' },
              init: { type: 'Literal', value: 0, raw: '0' } },
            { type: 'VariableDeclarator',
              id: { type: 'Identifier', name: 'acc' },
              init: { type: 'Literal', value: 0, raw: '0' } }],
         kind: 'var' },

      //
      // `i < arr.length`
      //
      test:
       { type: 'BinaryExpression',
         operator: '<',
         left: { type: 'Identifier', name: 'i' },
         right:
          { type: 'MemberExpression',
            computed: false,
            object: { type: 'Identifier', name: 'arr' },
            property: { type: 'Identifier', name: 'length' } } },

      //
      // `i++`
      //
      update:
       { type: 'UpdateExpression',
         operator: '++',
         argument: { type: 'Identifier', name: 'i' },
         prefix: false },

      //
      // `arr[i] += 1;`
      //
      body:
       { type: 'ExpressionStatement',
         expression:
          { type: 'AssignmentExpression',
            operator: '+=',
            left: { type: 'Identifier', name: 'acc' },
            right:
             { type: 'MemberExpression',
               computed: true,
               object: { type: 'Identifier', name: 'arr' },
               property: { type: 'Identifier', name: 'i' } } } }
```

JSON тоже можно визуализировать:

![https://darksi.de/images/ast.svg](https://darksi.de/images/ast.svg)

Это дерево, потому по нему можно удобно проходить сверху донизу, генерируя машинный код, когда посещаем его узлы. Проблема этого подхода в том, что информация о переменных очень скудна и распространяется по разным узлам дерева.

Для безопасного перемещения поиска длины из цикла, мы, опять же, должны знать, что длина массива не меняется между его итерациями. Люди могут легко это сделать, взглянув на сам исходный код, но компилятору нужно неплохо поработать, чтобы извлечь эту информацию прямиком из AST.

Как и большинство остальных компиляторных проблем, эта решается путем поднятия данных на более подходязий уровень абстракции, т.е. уровень промежуточного представления. Конкретно в нашем случае такой выбор ПП будет называться потоковым графом (data-flow graph). Вместо того, чтобы говорить об сущностях синтаксиса (вроде `for loop`, `expressions`, ...), мы должны говорить о самих данных (чтение, значения переменных) и как они меняются через программу.

## Потоковый граф

В нашем примере данные в которых мы заинтересованы это значение переменной `arr`. Мы хотим иметь возможность легко наблюдать за всеми действиями, чтобы убедиться нет ли у него доступа за пределы допустимого диапазона или каких-либо других изменений, который могли бы изменить длину массива.

Этого можно достигнуть путем введения "def-use" (определение и использования) поведения между разными значениями данных. Это значит, что значение было объявлено один раз (узел) и было использовано для создания новых значений (граница для каждого использования). Очевидно, объединение разных значений сформирует **потоковый граф**, вроде такого:

![https://darksi.de/images/data-flow.svg](https://darksi.de/images/data-flow.svg)

Обратите внимание на красный блок `array`. Стрелки, выходящие из него, представляют использования его значения. Перебирая эти границы, компилятор может определить, что значение `array` использовалось в:

- `loadArrayLength`
- `checkIndex`
- `load`

Подобные графы строятся так, чтобы явно "клонировать" узел массива, если к его значению был получен деструктивный доступ. (т.е. хранилища, размеры длины). Где бы мы не наблюдали `array`, в узле или его использованиях, мы всегда должны быть уверены, что его значение не изменяется.

Может звучать сложно, но этого свойства графа достаточно легко достичь, он должен следовать правилам [Single Static Assignment](https://en.wikipedia.org/wiki/Static_single_assignment_form) (SSA). Вкратце, чтобы конвертировать любую программу в [SSA](https://en.wikipedia.org/wiki/Static_single_assignment_form), компилятору нужно переименовать все присваивания и последующие использования переменных, чтобы убедиться что каждая переменная была определена единожды.

Пример до SSA:

```js
var a = 1;
console.log(a);
a = 2;
console.log(a);
```

После SSA:

```js
var a0 = 1;
console.log(a0);
var a1 = 2;
console.log(a1);
```

Таким образом, мы, говоря об `a0`, можем быть уверены, что на самом деле говорим об одном присвоении. Это близко к тому, как люди делают штуки на функциональных языках!

Видя, что `loadArrayLength`  не имеет управляющих зависимостей (i.e. нет пунктирных линий; мы поговорим о них позже), компилятор может заключить, что этот узел можно переместить в любое другое место вне цикла. Проходя по графу глубже, мы можем наблюдать что значение узла `ssa:phi` всегда находится между `0` и `arr.length`, потому `checkIndex` может быть удален польностью.

Довольно аккуратно, не так ли?

## Граф потока управления

Представление потока данных может быть очень полезным во многих случаях, но из его проблем заключается в том, что, превращая над код в граф такого вида, мы делаем шаг назад в нашей цепочке представлений (от исходного кода к машинному). Это промежуточное представление для генерации машинного подходит даже меньше, чем AST.

Причина в том что машина представляет собой просто последовательный список инструкций, который CPU выполняет один за другим. Наш финальный граф не отображает этого. По сути, принудительного упорядочивания узлов в нем вообще нет.

Обычно это решается группировкой узлов графа в блоки. Такое представление известно как [граф потока управления](https://en.wikipedia.org/wiki/Control_flow_graph) ([Control Flow Graph](https://en.wikipedia.org/wiki/Control_flow_graph)). Пример:

```js
    b0 {
      i0 = literal 0
      i1 = literal 0

      i3 = array
      i4 = jump ^b0
    }
    b0 -> b1

    b1 {
      i5 = ssa:phi ^b1 i0, i12
      i6 = ssa:phi ^i5, i1, i14

      i7 = loadArrayLength i3
      i8 = cmp "<", i6, i7
      i9 = if ^i6, i8
    }
    b1 -> b2, b3
    b2 {
      i10 = checkIndex ^b2, i3, i6
      i11 = load ^i10, i3, i6
      i12 = add i5, i11
      i13 = literal 1
      i14 = add i6, i13
      i15 = jump ^b2
    }
    b2 -> b1

    b3 {
      i16 = exit ^b3
    }
```

Он называется графом не просто так. Например, блоки `bXX` представляют узлы, а стрелки `bXX -> bYY` представляют границы. Давайте визуализируем это:

![https://darksi.de/images/cfg.svg](https://darksi.de/images/cfg.svg)

Как вы можете видеть, перед циклом в блоке `b0` есть код, а также заголовок цилка в `b1`, тест цикла в `b2`, тело цикла в `b3` и выход из узла в `b4`.

Перевод в машинный код становится очень простым благодаря из такого формату. Мы просто заменяем идентификаторы `iXX` на имена регистров CPU (в каком-то смысле, геристры CPU являются своего рода переменными, CPU имеет ограниченное количество регистров, потому нам надо быть осторожными чтоб они не закончились), и построчно генерируем машинный код для каждой инструкции.

Подводя итоги, [CFG](https://en.wikipedia.org/wiki/Control_flow_graph) имеет связи потоков данных и упорядоченность. Это позволяет нам использовать его как для анализа данных, так и для генерации машинного кода. Однако, попытка оптимизировать CFG путем манипуляций над блоками и их содержимым, может быстро усложниться и стать подверженной ошибкам.

Вместо того, Clifford Click и Keith D. Cooper предложили использовать подход, называемый **[морем узлов (sea-of-nodes)](http://www.researchgate.net/profile/Cliff_Click/publication/2394127_Combining_Analyses_Combining_Optimizations/links/0a85e537233956f6dd000000.pdf).**

## Море узлов (**Sea-of-Nodes)**

Помните наш крутой потоковый граф с пунктриными линиями? Эти пунктирные линии как раз таки делают потоковый граф **графом моря узлов**.

Вместо группировки в блоки и упорядочивания узлов, мы решили объявить управляющие зависимости в графе, как пунктриные границы. Если мы удалим из графа все **непунктирные** штуки и немного сгруппируем все, то получим:

![https://darksi.de/images/control-flow-sea.svg](https://darksi.de/images/control-flow-sea.svg)

Добавим немного воображения и порядка узлам, мы сможем увидеть что этот граф является тем же самым что и упрощенный CFG граф, окторый мы видели выше:

![https://darksi.de/images/cfg.svg](https://darksi.de/images/cfg.svg)

Давайте еще раз вглянем на представление **sea-of-nodes**:

![https://darksi.de/images/data-flow.svg](https://darksi.de/images/data-flow.svg)

Разительная разница между этим и CFG графом в том, что здесь нет упорядочивания узлой, кроме тех, которые имеют управляющие зависимости (другими словами, узлы участвуют в в потоке управления).

Это представление - очень мощный способ взглянуть на код. Он знает все об общем графике потока данных и может быть легко изменен без постоянного удаления / замены узлов в блоках.

## Сокращения

Говоря об изменениях, давайте обсудим, как изменить график. Граф «море узлов» обычно модифицируется путем сокращения графа. Мы просто ставим в очередь все узлы на графике и вызываем нашу функцию сокращения для каждого узла в очереди. Все, к чему притрагивается эта функция (изменяет, заменяет), ставится назад в очередь и будет передано функции позже. Если у вас есть много сокращений, вы можете просто сложить их вместе и вызвать их все на каждом узле в очереди, или, альтернативно, вы можете просто применить их один за другим, если они зависят от конечного состояния друг друга. Работает прелестно!

Я написал набор инструментов для JavaScript для моих экспериментов с sea-of-nodes, который включает:

- [json-pipeline](https://github.com/indutny/json-pipeline) - сборщик и stdlib графа. Предоставляет методы для создания узлов, добавления им входных данных, изменения их зависимостей и экспорта/импорта графа из/в данные!
- [json-pipeline-reducer](https://github.com/indutny/json-pipeline-reducer) - движок сокращений. Просто создаем экземпляр редуктора, скармливаем ему функции для сокращения и выполняем редьюсер на уже существующем графе [json-pipeline](https://github.com/indutny/json-pipeline).
- [json-pipeline-scheduler](https://github.com/indutny/json-pipeline-scheduler) - библиотека для возврата неупорядоченного графа в ограниченном количестве блоков, соединенных между собой управляющими ребрами (пунктирными линиями).

Объединенные вместе, эти инструменты могут решить множество проблем, который могут быть сформулированы в терминах уравнений потока данных.

Пример сокращения, который будет оптимизировать наш исходный JS код:

```js
for (var i = 0, acc = 0; i < arr.length; i++) acc += arr[i];
```

### **TL;DR**

Этот кусок кода достаточно велик, потому если хотите пропустить его - вот вам заметки о том, что мы делаем с его помощью:

- Вычисляем целочисленные диапазоны различных узлов: literal, add, phi
- Вычисляем лимиты тела ветки
- Применяем диапазон и ограничиваем информацию (`i` всегда будет неотрицательным числом, ограниченным `arr.length`) , чтобы сделать вывод, что проверка длины не нужна может быть удалена
- `arr.length` будет убран из цикла автоматически с помощью `json-pipeline-scheduler`. Потому что для планировки узлов в блоках он совершает [Global Code Motion](https://courses.cs.washington.edu/courses/cse501/04wi/papers/click-pldi95.pdf).

```js
// Для просмотра вывода graphviz
var fs = require("fs");

var Pipeline = require("json-pipeline");
var Reducer = require("json-pipeline-reducer");
var Scheduler = require("json-pipeline-scheduler");

//
// Создаем пустой граф с удобными методами CFG.
//
var p = Pipeline.create("cfg");

//
// Парсим данные и генерируем граф.
//
p.parse(
	`pipeline {
  b0 {
  i0 = literal 0
  i1 = literal 0

        i3 = array
        i4 = jump ^b0
      }
      b0 -> b1

      b1 {
        i5 = ssa:phi ^b1 i0, i12
        i6 = ssa:phi ^i5, i1, i14

        i7 = loadArrayLength i3
        i8 = cmp "<", i6, i7
        i9 = if ^i6, i8
      }
      b1 -> b2, b3
      b2 {
        i10 = checkIndex ^b2, i3, i6
        i11 = load ^i10, i3, i6
        i12 = add i5, i11
        i13 = literal 1
        i14 = add i6, i13
        i15 = jump ^b2
      }
      b2 -> b1

      b3 {
        i16 = exit ^b3
      }

  }`,
	{ cfg: true },
	"printable",
);

if (process.env.DEBUG) fs.writeFileSync("before.gv", p.render("graphviz"));

//
// Создаем хелпер для сокращений
//

function reduce(graph, reduction) {
	var reducer = new Reducer();
	reducer.addReduction(reduction);
	reducer.reduce(graph);
}

//
// Создаем сокращение
//
var ranges = new Map();

function getRange(node) {
	if (ranges.has(node)) return ranges.get(node);

	var range = { from: -Infinity, to: +Infinity, type: "any" };
	ranges.set(node, range);
	return range;
}

function updateRange(node, reducer, from, to) {
	var range = getRange(node);

	// Самый низкий тип
	if (range.type === "none") return;

	if (range.from === from && range.to === to && range.type === "int") return;

	range.from = from;
	range.to = to;
	range.type = "int";
	reducer.change(node);
}

function updateType(node, reducer, type) {
	var range = getRange(node);

	if (range.type === type) return;

	range.type = type;
	reducer.change(node);
}

//
// Устанавливаем тип литерала
//
function reduceLiteral(node, reducer) {
	var value = node.literals[0];
	updateRange(node, reducer, value, value);
}

function reduceBinary(node, left, right, reducer) {
	if (left.type === "none" || right.type === "none") {
		updateType(node, reducer, "none");
		return false;
	}

	if (left.type === "int" || right.type === "int")
		updateType(node, reducer, "int");

	if (left.type !== "int" || right.type !== "int") return false;

	return true;
}

//
// Объединяем диапазоны входных данных
//
function reducePhi(node, reducer) {
	var left = getRange(node.inputs[0]);
	var right = getRange(node.inputs[1]);

	if (!reduceBinary(node, left, right, reducer)) return;

	if (node.inputs[1].opcode !== "add" || left.from !== left.to) return;

	var from = Math.min(left.from, right.from);
	var to = Math.max(left.to, right.to);
	updateRange(node, reducer, from, to);
}

//
// Находим phi = phi + <positive number>, где начальный phi является числом,
// сообщаем правильный диапазон.
//
function reduceAdd(node, reducer) {
	var left = getRange(node.inputs[0]);
	var right = getRange(node.inputs[1]);

	if (!reduceBinary(node, left, right, reducer)) return;

	var phi = node.inputs[0];
	if (phi.opcode !== "ssa:phi" || right.from !== right.to) return;

	var number = right.from;
	if (number <= 0 || phi.inputs[1] !== node) return;

	var initial = getRange(phi.inputs[0]);
	if (initial.type !== "int") return;

	updateRange(node, reducer, initial.from, +Infinity);
}

var limits = new Map();

function getLimit(node) {
	if (limits.has(node)) return limits.get(node);

	var map = new Map();
	limits.set(node, map);
	return map;
}

function updateLimit(holder, node, reducer, type, value) {
	var map = getLimit(holder);
	if (!map.has(node)) map.set(node, { type: "any", value: null });

	var limit = map.get(node);
	if (limit.type === type && limit.value === value) return;
	limit.type = type;
	limit.value = value;
	reducer.change(holder);
}

function mergeLimit(node, reducer, other) {
	var map = getLimit(node);
	var otherMap = getLimit(other);

	otherMap.forEach(function (limit, key) {
		updateLimit(node, key, reducer, limit.type, limit.value);
	});
}

//
// Распространяем лимит от X < Y к правдивой ветке `if`
//
function reduceIf(node, reducer) {
	var test = node.inputs[0];
	if (test.opcode !== "cmp" || test.literals[0] !== "<") return;

	var left = test.inputs[0];
	var right = test.inputs[1];

	updateLimit(node.controlUses[0], left, reducer, "<", right);
	updateLimit(node.controlUses[2], left, reducer, ">=", right);
}

//
// Определяем диапазоны и границы значений.
//

var rangeAndLimit = new Reducer.Reduction({
	reduce: function (node, reducer) {
		if (node.opcode === "literal") reduceLiteral(node, reducer);
		else if (node.opcode === "ssa:phi") reducePhi(node, reducer);
		else if (node.opcode === "add") reduceAdd(node, reducer);
		else if (node.opcode === "if") reduceIf(node, reducer);
	},
});
reduce(p, rangeAndLimit);

//
// Теперь, когда у нас есть диапазоны и лимиты,
// время удалить бесполезные проверки
// длины массива.
~~/~~/;

function reduceCheckIndex(node, reducer) {
	// Проходим по цепочке управления
	var region = node.control[0];
	while (region.opcode !== "region" && region.opcode !== "start")
		region = region.control[0];

	var array = node.inputs[0];
	var index = node.inputs[1];

	var limit = getLimit(region).get(index);
	if (!limit) return;

	var range = getRange(index);

	// Делаем массив отрицательным, есть индекс невалиден
	if (range.from < 0) return;

	// Индекс должен быть ограничен длинной массива
	if (
		limit.type !== "<" ||
		limit.value.opcode !== "loadArrayLength" ||
		limit.value.inputs[0] !== array
	) {
		return;
	}

	// Проверяем, безопасно ли удалять!
	reducer.remove(node);
}

var eliminateChecks = new Reducer.Reduction({
	reduce: function (node, reducer) {
		if (node.opcode === "checkIndex") reduceCheckIndex(node, reducer);
	},
});
reduce(p, eliminateChecks);

//
// Запускаем планировщик, чтобы положить все
// назад в CFG
//

var out = Scheduler.create(p).run();
out.reindex();

if (process.env.DEBUG) fs.writeFileSync("after.gv", out.render("graphviz"));

console.log(out.render({ cfg: true }, "printable"));
```
