---
title: smi и double представления [перевод]
description:
date: 2021-09-24
tags: ["computer_science", "переводы"]
---

Вольный перевод статьи Fedor Indutny "[SMIs and Doubles](https://darksi.de/6.smis-and-doubles/)"

# SMI и Double представления

## Цели

В прошлой статье мы реализовали простой распределитель памяти и научили наш компилятор работать с числами с плавающей запятой, храня их в выделенных объектах кучи. Однако числа с плавающей запятой не подходят для некоторых точных операций, а также, поскольку они хранятся в памяти, что требует дополнительной загрузки и сохранения памяти, что снижает производительность кода.

Обе проблемы можно решить с помощью поддержки целых чисел, как мы делали в первой статье, что значит что нам нужно внедрить поддержку обоих типов чисел в рантайме компилятора.

## Отметки

Вспомним, что мы храним указатели и числа в виде 64-х битных регистров общего назначения (`rax`, `rbx`, ...). Главная проблема в том, что мы должны иметь возможность определить, полученный регистр (например, `rax`) имеет указатель на объект кучи или на само число (_SMI_).

Обычно для такого используется метод "tagging". Есть [несколько способов](http://wingolog.org/archives/2011/05/18/value-representation-in-javascript-implementations) реализовать отметки, включая: [Nan-Boxing](http://evilpie.github.io/sayrer-fatval-backup/cache.aspx.htm) (описание находится в блоке *Mozilla’s New JavaScript Value Representation*) и Nun-Boxing. Нашему компилятору нужно будет просто зарезервировать один бит 64-х битного регистра и добавлять к нему `1`, если значение является указателем, и  `0`, если значение является *SMI* (Small Integer).

Пример:

![https://darksi.de/images/smi-and-pointer.png](https://darksi.de/images/smi-and-pointer.png)

Заметьте что чотбы получить значение SMI нам потребуется сдвинуть его на один бит вправо (`>> 1`) и конвертировать целое число в SMI - сдвиг влево (`<< 1`). Использование нуля для отметки SMI очень окупается, поскольку нам не нужно размечать числа, чтобы выполнить сложение и вычитание.

Чтобы использовать отмеченные указатели нам нужно найти значение находящееся на один бит левее фактического, что достаточно легко реализовать:

```js
// Предположим что отмеченный указатель находится в rbx
// И нам нужно загрузить его содержимое в rax
this.mov("rax", ["rbx", -1]);
```

И для удобства, пример непомеченных SMI:

```js
// Непомеченный
this.shr("rax", 1);
// Помеченный
this.shl("rax", 1);
```

И одна из главных частей - проверка является ли значение указателем:

```js
// Проверить, есть ли у'rax' последний бит
this.test("rax", 1);

// 'z' означает zero
// Перейти к метке, если `(rax & 1) == 0`
this.j("z", "is-smi");

// 'nz' означает non-zero
// Перейти к метке, если `(rax & 1) != 0`
this.j("ne", "is-heap-object-pointer");
```

## Перерабатываем имеющийся код

С помощью [кода из прошлого поста](https://github.com/indutny/jit.js/tree/master/example/heap), мы наконец можем приступить к реализации всех новых штук.

В первую очередь, давайте добавим helper методы.

```js
function untagSmi(reg) {
	this.shr(reg, 1);
}

function checkSmi(value, t, f) {
	// Если не были определены `true-` и `false-`
	// просто тестируем значение.
	if (!t && !f) return this.test(value, 1);

	// Вводим новую область видимости, чтобы иметь возможность использовать именованные метки
	this.labelScope(function () {
		// Тестируем значение
		this.test(value, 1);

		// Пропускаем SMI случай, если результат non-zero
		this.j("nz", "non-smi");

		// Запускаем SMI случай
		t.call(this);

		// Переходим к общему концу
		this.j("end");

		// Запускаем Non-SMI случай
		this.bind("non-smi");
		f.call(this);

		// Общий конец
		this.bind("end");
	});
}

function heapOffset(reg, offset) {
	// ПРИМЕЧАНИЕ: 8 - это размер указателя x64 архитектуры.
	// Добавляем 1 к смещению, поскольку на первом месте
	// хранится тип объектов кучи.
	return [reg, 8 * ((offset | 0) + 1) - 1];
}
```

Мы можем включить эти методы в контекст jit.js, передав их как свойство `helpers` в API метод `jit.compile()`:

```js
var helpers = {
	untagSmi: untagSmi,
	checkSmi: checkSmi,
	heapOffset: heapOffset,
};

jit.compile(
	function () {
		// Здесь мы можем использовать хелперы:
		this.untagSmi("rax");

		this.checkSmi(
			"rbx",
			function () {
				// Здесь работаем со SMI
			},
			function () {
				// Здесь работаем с указателями
			},
		);

		this.mov(this.heapOffset("rbx", 0), 1);
	},
	{ stubs: stubs, helpers: helpers },
);
```

## Назначение

Сейчас нам нужно сделать чтобы наш стаб `Alloc` вовзращал помеченный указатель. Также мы используем возможность и немного улучшим его с помощью добавления аргументов `tag` и `size`:

```js
stubs.define("Alloc", function (size, tag) {
	// Сохраняем регистры 'rbx' и 'rcx'
	this.spill(["rbx", "rcx"], function () {
		// Загружаем `offset`
		//
		// ПРИМЕЧАНИЕ: Мы будем использовать указатель для переменной `offset`, чтобы была вохможность
		// позже обновить ее
		this.mov("rax", this.ptr(offset));
		this.mov("rax", ["rax"]);

		// Конец загрузки
		//
		// ПРИМЕЧАНИЕ: То же самое относится и к концу страницы, но мы не обновляем его прямо сейчас
		this.mov("rbx", this.ptr(end));
		this.mov("rbx", ["rbx"]);

		// Вычисляем новый `offset`
		this.mov("rcx", "rax");

		// Добавляем размер тега и тела
		this.add("rcx", 8);
		this.add("rcx", size);

		// Проверяем, не переполняется ли буффер фиксированного размера
		this.cmp("rcx", "rbx");

		// this.j() выполняет условный переход к указанной метке..
		// 'g' означает 'greater'
		// 'overflow' - это имя метки, связанной ниже
		this.j("g", "overflow");

		// Окей, может двигаться дальше и обновить offset
		this.mov("rbx", this.ptr(offset));
		this.mov(["rbx"], "rcx");

		// Первый 64-х битный указатель зарезервирован для 'tag',
		// второй имеет значение `double`
		this.mov("rcx", tag);
		this.mov(["rax"], "rcx");

		// !!!!!!!!!!!!!!!!!!!
		// ! Указатель метки !
		// !!!!!!!!!!!!!!!!!!!
		this.or("rax", 1);

		// Возвращаем 'rax'
		this.Return();

		// Переполнение :(
		this.bind("overflow");

		// Вызываем javascript функцию!
		// ПРИМЕЧАНИЕ: Штука ниже очень прикольная, но я поясню ее позже
		this.runtime(function () {
			console.log("GC is needed, but not implemented");
		});

		// Краш
		this.int3();

		this.Return();
	});
});
```

## Математические стабы

Также нам придется немного доработать математические операции для поддержки SMI и double значений, давайте пока разделим их и добавим код который обрабатывает double:

```js
var operators = ["+", "-", "*", "/"];
var map = { "+": "addsd", "-": "subsd", "*": "mulsd", "/": "divsd" };

// Определяем `Binary+`, `Binary-`, `Binary*` и `Binary/` стабы
operators.forEach(function (operator) {
	stubs.define("Binary" + operator, function (left, right) {
		// Сохраняем 'rbx' и 'rcx'
		this.spill(["rbx", "rcx"], function () {
			// Загружаем аргументы для rax и rbx
			this.mov("rax", left);
			this.mov("rbx", right);

			// Конвертируем оба числа в double
			[
				["rax", "xmm1"],
				["rbx", "xmm2"],
			].forEach(function (regs) {
				var nonSmi = this.label();
				var done = this.label();

				this.checkSmi(regs[0]);
				this.j("nz", nonSmi);

				// Конвертируем целое число в double
				this.untagSmi(regs[0]);
				this.cvtsi2sd(regs[1], regs[0]);

				this.j(done);
				this.bind(nonSmi);

				this.movq(regs[1], this.heapOffset(regs[0], 0));
				this.bind(done);
			}, this);

			var instr = map[operator];

			// Выполняем бинарную операцию
			if (instr) {
				this[instr]("xmm1", "xmm2");
			} else {
				throw new Error("Unsupported binary operator: " + operator);
			}

			// Выделяем новое число и складываем в него значение
			// ПРИМЕЧАНИЕ: Последние два аргумента являются
			// аргументами стаба (`size` и `tag`)
			this.stub("rax", "Alloc", 8, 1);
			this.movq(this.heapOffset("rax", 0), "xmm1");
		});

		this.Return();
	});
});
```

Обратите внимание, что стаб также преобразует все входящие числа в double.

## Компилятор

И сснова к коду компилятора:

```js
function visitProgram(ast) {
	assert.equal(ast.body.length, 1, "Only one statement programs are supported");
	assert.equal(ast.body[0].type, "ExpressionStatement");

	// Конвертируем в целое число имеющийся в 'rax' указатель
	visit.call(this, ast.body[0].expression);

	// Получаем число с плавающей запятой из числа кучи
	this.checkSmi(
		"rax",
		function () {
			// Убираем метку smi
			this.untagSmi("rax");
		},
		function () {
			this.movq("xmm1", this.heapOffset("rax", 0));

			// Округляем до нуля
			this.roundsd("zero", "xmm1", "xmm1");

			// Конвертируем double в целое число
			this.cvtsd2si("rax", "xmm1");
		},
	);
}

function visitLiteral(ast) {
	assert.equal(typeof ast.value, "number");

	if ((ast.value | 0) === ast.value) {
		// SMI, отмеченное значение
		// (т.е. val * 2) с последним битом, приведенным к нулю
		this.mov("rax", utils.tagSmi(ast.value));
	} else {
		// Выделяем новое число кучи
		this.stub("rax", "Alloc", 8, 1);

		// Сохраняем 'rbx' регистр
		this.spill("rbx", function () {
			this.loadDouble("rbx", ast.value);

			// ПРИМЕЧАНИЕ: Последний бит указателей приведен к единице
			// Поэтому нам нужно использовать процедуру 'heapOffset'
			// чтобы получить доступ к памяти
			this.mov(this.heapOffset("rax", 0), "rbx");
		});
	}
}

function visitBinary(ast) {
	// Сохраняем 'rbx' после того, как вышли из AST узла
	this.spill("rbx", function () {
		// Посещаем правую сторону выражения
		visit.call(this, ast.right);

		// Перемещаем в 'rbx'
		this.mov("rbx", "rax");

		// Посещаем левую сторону выражения (результат в 'rax')
		visit.call(this, ast.left);

		//
		// Обобщяя, левая сторона хранится в 'rax', правая - в 'rbx'
		//

		if (ast.operator === "/") {
			// Вызываем стаб для операции деления
			this.stub("rax", "Binary" + ast.operator, "rax", "rbx");
		} else {
			this.labelScope(function () {
				// Проверяем, являются ли оба числа SMI
				this.checkSmi("rax");
				this.j("nz", "call stub");
				this.checkSmi("rbx");
				this.j("nz", "call stub");

				// Сохраняем rax в случае смещения
				this.mov("rcx", "rax");

				// ПРИМЕЧАНИЕ: В этой точке оба 'rax'и 'rbx' являются отмеченными.
				// Метки не нужно убирать, если мы выполняем операции
				// сложения и вычитания. Однако, в случае с
				// умножением, результат будет вдвое больше, если
				// не убрать метки.
				if (ast.operator === "+") {
					this.add("rax", "rbx");
				} else if (ast.operator === "-") {
					this.sub("rax", "rbx");
				} else if (ast.operator === "*") {
					this.untagSmi("rax");
					this.mul("rbx");
				}

				// При переполнении восстановить 'rax' из 'rcx' и вызвать стаб
				this.j("o", "restore");

				// Иначе вернуть'rax'
				this.j("done");
				this.bind("restore");

				this.mov("rax", "rcx");

				this.bind("call stub");

				// Вызвать стаб и вернуть номер кучи в 'rax'
				this.stub("rax", "Binary" + ast.operator, "rax", "rbx");

				this.bind("done");
			});
		}
	});
}

function visitUnary(ast) {
	if (ast.operator === "-") {
		// Делаем аргумент отрицательным эмулируя бинарное выражение
		visit.call(this, {
			type: "BinaryExpression",
			operator: "*",
			left: ast.argument,
			right: { type: "Literal", value: -1 },
		});
	} else {
		throw new Error("Unsupported unary operator: " + ast.operator);
	}
}
```

Подведем итоги: теперь мы можем работать с SMI значениями по умолчанию, внедряя ради скорости дополнительные операции, и возвращаться к double значениям в случае переполнения или любых других проблем, вроде попытки найти сумму значений double и SMI!
