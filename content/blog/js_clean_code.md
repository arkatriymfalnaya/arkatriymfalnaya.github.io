---
title: концепты чистого кода, адаптированные для javascript [перевод]
description:
date: 2023-10-15
tags: ["computer_science", "javascript", "architecture", "переводы"]
---

Вольный перевод статьи Ryan McDermott "[Clean Code concepts adapted for JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)"

# Концепты чистого кода, адаптированные для JavaScript

## Введение

![Alt Text](https://dev-to-uploads.s3.amazonaws.com/i/pkfqc1h4te8qg4zwwt3y.jpeg)

Инженерные принципы ПО из книги "_[Clean Code](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)_" автора Robert C. Martin, адаптированные для JavaScript. Это не стайлгайд, а руководство по созданию [читабельного, переиспользуемого и поддерживаемого](https://github.com/ryanmcdermott/3rs-of-software-architecture) ПО на JavaScript.

Не каждому из этих принципов стоит строго следовать, и еще меньшее их количество будет повсеместно согласовано. Принципы были систематизированы путём многолетнего коллективного опыта авторов "_Clean Code_", но это только руководство и ничего более.

Нашему ремеслу разработки ПО чуть более пятидесяти лет, и мы все еще учимся многому. Возможно, когда архитектура ПО станет настолько стара, как сама архитектура, у нас появятся более строгие правила. Но сейчас, пускай это руководство служит неким критерием оценки JavaScript кода для вас и вашей команды.

Еще одна вещь: знание и пользование этих принципов не сделает вас более хорошим разработчиком ПО в момент, как и работа с ними на протяжении многих лет не будет говорить о том, что вы не совершаете ошибок. Каждый кусок кода начинается с наброска, как влажная глина, еще не принявшая финальную форму. Наконец, мы ведь правим недостатки во время ревью кода со своими коллегами. И вместо того, чтобы корить себя, улучшайте код!

## Переменные

### Используйте выразительные и произносимые имена переменных

**Плохо:**

```js
const yyyymmdstr = moment().format("YYYY/MM/DD");
```

**Хорошо:**

```js
const currentDate = moment().format("YYYY/MM/DD");
```

### Используйте схожую терминологию для переменных одного типа

**Плохо:**

```js
getUserInfo();
getClientData();
getCustomerRecord();
```

**Хорошо:**

```js
getUser();
```

### Используйте доступные для поиска имена

Кода мы читаем гораздо больше, чем пишем. И потому важно, что он был читабельным и доступным для поиска. Именуя переменные неясным для понимания способом, мы раним наших читателей. Делайте имена доступными, а инструменты, вроде [buddy.js](https://github.com/danielstjules/buddy.js) и [ESLint](https://github.com/eslint/eslint/blob/660e0918933e6e7fede26bc675a0763a6b357c94/docs/rules/no-magic-numbers.md), помогут определить неназванные константы.

**Плохо:**

```js
// Для чего вообще 86400000?
setTimeout(blastOff, 86400000);
```

**Хорошо:**

```js
// Объявите их в верхнем регистре, как константы.
const MILLISECONDS_IN_A_DAY = 86_400_000;
setTimeout(blastOff, MILLISECONDS_IN_A_DAY);
```

### Используйте поясняющие переменные

**Плохо:**

```js
const address = "One Infinite Loop, Cupertino 95014";
const cityZipCodeRegex = /^[^,**\\**]+[,**\\**\s]+(.+?)\s*(\d{5})?$/;
saveCityZipCode(
	address.match(cityZipCodeRegex)[1],
	address.match(cityZipCodeRegex)[2],
);
```

**Хорошо:**

```js
const address = "One Infinite Loop, Cupertino 95014";
const cityZipCodeRegex = /^[^,**\\**]+[,**\\**\s]+(.+?)\s*(\d{5})?$/;
const [_, city, zipCode] = address.match(cityZipCodeRegex) || [];
saveCityZipCode(city, zipCode);
```

### Избегайте мысленных связей

Явное лучше неявного.

**Плохо:**

```js
const locations = ["Austin", "New York", "San Francisco"];
locations.forEach((l) => {
	doStuff();
	doSomeOtherStuff();
	// ...
	// ...
	// ...
	// Стоп, еще раз, а `l` для чего?
	dispatch(l);
});
```

**Хорошо:**

```js
const locations = ["Austin", "New York", "San Francisco"];
locations.forEach((location) => {
	doStuff();
	doSomeOtherStuff();
	// ...
	// ...
	// ...
	dispatch(location);
});
```

### Не добавляйте ненужный контекст

Если имя вашего класса/объекта о чем-то говорит - не повторяйте этого в имени переменной.

**Плохо:**

```js
const Car = {
	carMake: "Honda",
	carModel: "Accord",
	carColor: "Blue",
};

function paintCar(car) {
	car.carColor = "Red";
}
```

**Хорошо:**

```js
const Car = {
	make: "Honda",
	model: "Accord",
	color: "Blue",
};

function paintCar(car) {
	car.color = "Red";
}
```

### Используйте дефолтные аргументы вместо состояния

Дефолтные аргументы обычно чище, чем объявление с помощью состояния, поскольку такая функция задаст значение по умолчанию только для аргументов типа `undefined`, а для других "falsy" значений, вроде `''`, `""`, `false`, `null`, `0` и `NaN`, - нет.

**Плохо:**

```js
function createMicrobrewery(name) {
	const breweryName = name || "Hipster Brew Co.";
	// ...
}
```

**Хорошо:**

```js
function createMicrobrewery(name = "Hipster Brew Co.") {
	// ...
}
```

## Функции

### Аргументы функции **(в идеале - два и меньше)**

Для более легкого тестирования функции невероятно важно ограничивать количество ее параметров. Иначе, при необходимости тестирования множества различных случаев с каждым отдельным аргументом, произойдет комбинаторный взрыв.

Один или два аргумента - идеальный вариант, а большего количества, если возможно, стоит избегать. Обычно, если функция имеет более двух аргументов - она пытается сделать слишком много. Для большинства случаев будет достаточно объекта верхнего уровня в качестве аргумента.

Поскольку JavaScript позволяет создавать объекты на лету и без большого количества шаблонов классов, для множества аргументов вы можете использовать объект.

Чтобы сделать ожидаемые свойства более очевидными, можно использовать синтаксис деструктуризации из ES2015/ES6. Несколько его преимуществ:

1. Благодаря подписи функции сразу понятно, какие свойства используются.
2. Может использоваться для имитации именованных параметров.
3. Клонирует примитивные значения переданного в функцию аргумента-объекта, что может предотвратить побочные эффекты. Примечание: объекты и массивы, которые деструктурированы из аргумента-объекта, НЕ клонируются.
4. Линтеры могут предупредить о неиспользуемых свойствах, что было бы невозможно без деструктуризации.

**Плохо:**

```js
function createMenu(title, body, buttonText, cancellable) {
	// ...
}

createMenu("Foo", "Bar", "Baz", true);
```

**Хорошо:**

```js
function createMenu({ title, body, buttonText, cancellable }) {
	// ...
}

createMenu({
	title: "Foo",
	body: "Bar",
	buttonText: "Baz",
	cancellable: true,
});
```

### Функции должны выполнять только одно действие

Это самое важное правило в разработке ПО. Тяжелее объединять, тестировать и рассуждать о функциях, которые выполняют более одного действия, но гораздо проще рефакторить и читать изолированные и выполняющие только одно. Применяя лишь это правило из руководства, вы уже будете впереди многих разработчиков.

**Плохо:**

```js
function emailClients(clients) {
	clients.forEach((client) => {
		const clientRecord = database.lookup(client);
		if (clientRecord.isActive()) {
			email(client);
		}
	});
}
```

**Хорошо:**

```js
function emailActiveClients(clients) {
	clients.filter(isActiveClient).forEach(email);
}

function isActiveClient(client) {
	const clientRecord = database.lookup(client);
	return clientRecord.isActive();
}
```

### Имя функции должно говорить о том, что она делает

**Плохо:**

```js
function addToDate(date, month) {
	// ...
}

const date = new Date();

// Из имени функции тяжело сказать, что она добавляет
addToDate(date, 1);
```

**Хорошо:**

```js
function addMonthToDate(month, date) {
	// ...
}

const date = new Date();

addMonthToDate(1, date);
```

### Функции должны быть только одного уровня абстракции

Если уровней абстракции больше одного - ваша функция делает слишком много, а её разбиение даст возможности переиспользования кода и более легкого его тестирования.

**Плохо:**

```js
function parseBetterJSAlternative(code) {
	const REGEXES = [
		// ...
	];

	const statements = code.split(" ");
	const tokens = [];
	REGEXES.forEach((REGEX) => {
		statements.forEach((statement) => {
			// ...
		});
	});

	const ast = [];
	tokens.forEach((token) => {
		// обрабатываем...
	});

	ast.forEach((node) => {
		// парсим...
	});
}
```

**Хорошо:**

```js
function parseBetterJSAlternative(code) {
	const tokens = tokenize(code);
	const syntaxTree = parse(tokens);

	syntaxTree.forEach((node) => {
		// парсим...
	});
}

function tokenize(code) {
	const REGEXES = [
		// ...
	];

	const statements = code.split(" ");
	const tokens = [];

	REGEXES.forEach((REGEX) => {
		statements.forEach((statement) => {
			tokens.push(/* ... */);
		});
	});

	return tokens;
}

function parse(tokens) {
	const syntaxTree = [];

	tokens.forEach((token) => {
		syntaxTree.push(/* ... */);
	});

	return syntaxTree;
}
```

### Избавляйтесь от дублирующегося кода

Как можно больше старайтесь избегать повторяющегося кода. Он плох тем, что правки вашей логики придется вносить в несколько мест сразу.

Представьте, что вы открыли ресторан и начали вести учёт продукции: помидоры, лук, чеснок, специи и прочее. И после заказа чего-нибудь из тех самых помидоров, вам придется обновить все списки, если их несколько, но, имея только один список, и обновлять понадобится только его!

Часто вы дублируете код, потому что у вас есть несколько логических участков, которые во многом схожи, но некоторые их различия заставляют вас разделять их на функции. Удаление повторяющегося кода означает создание абстракции, обрабатывающей эту разную логику с помощью всего одной функции/модуля/класса.

Получение правильной абстракции критично, потому вам стоит следовать принципам SOLID, изложенным в разделе _Классы._ Плохие абстракции могут быть хуже повторяющегося кода, так что будьте осторожны! Если можете сделать хорошую абстракцию - делайте! Не повторяйтесь, иначе застанете себя за обновлением кода во множестве мест для изменения всего одной вещи.

**Плохо:**

```js
function showDeveloperList(developers) {
	developers.forEach((developer) => {
		const expectedSalary = developer.calculateExpectedSalary();
		const experience = developer.getExperience();
		const githubLink = developer.getGithubLink();
		const data = {
			expectedSalary,
			experience,
			githubLink,
		};

		render(data);
	});
}

function showManagerList(managers) {
	managers.forEach((manager) => {
		const expectedSalary = manager.calculateExpectedSalary();
		const experience = manager.getExperience();
		const portfolio = manager.getMBAProjects();
		const data = {
			expectedSalary,
			experience,
			portfolio,
		};

		render(data);
	});
}
```

**Хорошо:**

```js
function showEmployeeList(employees) {
	employees.forEach((employee) => {
		const expectedSalary = employee.calculateExpectedSalary();
		const experience = employee.getExperience();

		const data = {
			expectedSalary,
			experience,
		};

		switch (employee.type) {
			case "manager":
				data.portfolio = employee.getMBAProjects();
				break;
			case "developer":
				data.githubLink = employee.getGithubLink();
				break;
		}

		render(data);
	});
}
```

### Определяйте дефолтные объекты с помощью **Object.assign**

**Плохо:**

```js
const menuConfig = {
	title: null,
	body: "Bar",
	buttonText: null,
	cancellable: true,
};

function createMenu(config) {
	config.title = config.title || "Foo";
	config.body = config.body || "Bar";
	config.buttonText = config.buttonText || "Baz";
	config.cancellable =
		config.cancellable !== undefined ? config.cancellable : true;
}

createMenu(menuConfig);
```

**Хорошо:**

```js
const menuConfig = {
	title: "Order",
	// User не содержит ключа 'body'
	buttonText: "Send",
	cancellable: true,
};

function createMenu(config) {
	config = Object.assign(
		{
			title: "Foo",
			body: "Bar",
			buttonText: "Baz",
			cancellable: true,
		},
		config,
	);
	// теперь config имеет значение: {title: "Order", body: "Bar", buttonText: "Send", cancellable: true}
	// ...
}
createMenu(menuConfig);
```

### Не используйте флаги в качестве параметров функции

Флаги говорят вашему пользователю о том, что функция выполняет более одной вещи, чего делать не должна. Разбивайте функции, если, на основе булевого значения, они следуют различным путям кода.

**Плохо:**

```js
function createFile(name, temp) {
	if (temp) {
		fs.create(`./temp/${name}`);
	} else {
		fs.create(name);
	}
}
```

**Хорошо:**

```js
function createFile(name) {
	fs.create(name);
}

function createTempFile(name) {
	createFile(`./temp/${name}`);
}
```

### Избегайте побочных эффектов **(часть 1)**

Функция создает побочные эффект, если делает нечто иное, а не принятие и возвращение значения. Побочным эффектом может быть запись в файл, изменение глобальной переменной или случайная передача всех ваших денег незнакомцу.

Допустим, в некоторых случаях что вам нужно заиметь сайдэффект в программе. Как в прошлом примере, вам понадобилась запись в файл. Что нужно сделать, так это централизовать место, в котором вы будете это делать. Не заводите несколько функций и классов для записи в файл, а лишь один сервис, который всё сделает. Один и лишь один.

Суть в том, чтобы избежать распространенных подводных камней, вроде обмена состояния между объектами без какой-либо структуры, используя мутабельные (изменяемые) типы данных, которые могут быть записаны чем угодно, и нецентрализованного места для ваших сайд эффектов. Если сможете это сделать - станете счастливее большинства других программистов

**Плохо:**

```js
// Функция ссылается на глобальную переменную.
// Другая функция, использующая переменную name, могла бы сломать наш массив.
let name = "Ryan McDermott";

function splitIntoFirstAndLastName() {
	name = name.split(" ");
}

splitIntoFirstAndLastName();

console.log(name); // ['Ryan', 'McDermott'];
```

**Хорошо:**

```js
function splitIntoFirstAndLastName(name) {
	return name.split(" ");
}

const name = "Ryan McDermott";
const newName = splitIntoFirstAndLastName(name);

console.log(name); // 'Ryan McDermott';
console.log(newName); // ['Ryan', 'McDermott'];
```

### Избегайте побочный эффектов **(часть 2)**

В JavaScript примитивные типы данных передаются по значению, когда объекты и массивы - по ссылке. В случае объектов и массивов, если ваша функция вносит изменения в массив корзины покупок, например, добавляя элемент для покупки, то она повлияет на любую другую, использующую массив `cart`. Насколько это может быть здорово, настолько и плохо. Давайте представим плохую ситуацию:

Пользователь жмет на кнопку "Purchase", которая вызывает функцию `purchase`, которая создает сетевой запрос и отсылает массив `cart` на сервер. Из-за плохого интернет-соединения, функции `purchase` придется повторять запрос. И теперь, что если пользователь до начала запроса случайно нажмет на кнопку "Add to Cart" на ненужном ему товаре? В таком случае функция покупки отправит случайно добавленный элемент, поскольку у нее есть ссылка на массив корзины покупок, который функция `addItemToCart` изменила, добавив нежелательный элемент.

Отличное решение - функция `addItemToCart` всегда клонирует `cart`, изменяет его и возвращает клон. Это даст гарантию, что никакие другие функции, содержащие ссылку на корзину покупок, не будут подвержены изменениям.

Для этого подхода стоит упомянуть о двух предостережениях:

1. Могут быть случаи, когда вам понадобится изменить входной объект, но, приняв описанную выше практику, вы обнаружите, что подобные случаи довольно редки. Большинство штук можно отрефакторить таким образом, чтобы они не имели побочных эффектов!
2. С точки зрения производительности клонирование больших объектов может быть очень дорогой операцией. К счастью, проблема небольшая, поскольку есть [отличные библиотеки](https://immutable-js.github.io/immutable-js/), позволяющие такому подходу быстро и не так интенсивно использовать памят, как если бы вы клонировали объекты и массивы вручную.

**Плохо:**

```js
const addItemToCart = (cart, item) => {
	cart.push({
		item,
		date: Date.now(),
	});
};
```

**Хорошо:**

```js
const addItemToCart = (cart, item) => {
	return [...cart, { item, date: Date.now() }];
};
```

### Не вносите изменений в глобальные переменные

Загрязнение глобальных переменных - плохая практика, поскольку велика вероятность столкнуться с другой библиотекой, и пользователь вашего API не увидит проблемы, пока не словит исключение в продакшене. Такой пример: вам захотелось расширить нативный Array методом `diff`, который бы показывал разницу между двумя массивами. Вы могли бы написать новую функцию в `Array.prototype`, но она может столкнуться с библиотекой, которая пытается сделать то же самое. Что, если другая библиотека использовала `diff` метод для нахождения различий между первым и последним элементом массива? Вот поэтому гораздо лучшим способом будет расширение функциональности глобального `Array` с помощью ES2015/ES6 классов.

**Плохо:**

```js
Array.prototype.diff = function diff(comparisonArray) {
	const hash = new Set(comparisonArray);
	return this.filter((elem) => !hash.has(elem));
};
```

**Хорошо:**

```js
class SuperArray extends Array {
	diff(comparisonArray) {
		const hash = new Set(comparisonArray);
		return this.filter((elem) => !hash.has(elem));
	}
}
```

### Предпочитайте функциональное программирование императивному

JavaScript не является функциональным языком, как Haskell, но имеет к тому расположенность. Функциональные языки более чисты и просты для тестирования. Используйте эту парадигму, когда можете.

**Плохо:**

```js
const programmerOutput = [
	{
		name: "Uncle Bobby",
		linesOfCode: 500,
	},
	{
		name: "Suzie Q",
		linesOfCode: 1500,
	},
	{
		name: "Jimmy Gosling",
		linesOfCode: 150,
	},
	{
		name: "Gracie Hopper",
		linesOfCode: 1000,
	},
];

let totalOutput = 0;

for (let i = 0; i < programmerOutput.length; i++) {
	totalOutput += programmerOutput[i].linesOfCode;
}
```

**Хорошо:**

```js
const programmerOutput = [
	{
		name: "Uncle Bobby",
		linesOfCode: 500,
	},
	{
		name: "Suzie Q",
		linesOfCode: 1500,
	},
	{
		name: "Jimmy Gosling",
		linesOfCode: 150,
	},
	{
		name: "Gracie Hopper",
		linesOfCode: 1000,
	},
];

const totalOutput = programmerOutput.reduce(
	(totalLines, output) => totalLines + output.linesOfCode,
	0,
);
```

### Инкапсулируйте условия

**Плохо:**

```js
if (fsm.state === "fetching" && isEmpty(listNode)) {
	// ...
}
```

**Хорошо:**

```js
function shouldShowSpinner(fsm, listNode) {
	return fsm.state === "fetching" && isEmpty(listNode);
}

if (shouldShowSpinner(fsmInstance, listNodeInstance)) {
	// ...
}
```

### Избегайте негативных условий

**Плохо:**

```js
function isDOMNodeNotPresent(node) {
	// ...
}

if (!isDOMNodeNotPresent(node)) {
	// ...
}
```

**Хорошо:**

```js
function isDOMNodePresent(node) {
	// ...
}

if (isDOMNodePresent(node)) {
	// ...
}
```

### Избегайте самих условий

Похоже на невыполнимую задачу. Услышав это впервые, большинство людей говорят: " И как это я должен что-то делать без оператора `if`?". В большинстве случаев, для того же задания вы можете пользовать полиморфизм. Вторым вопросом обычно идет: "Здорово, конечно, но с чего бы мне это делать?". Ответом будет наш недавний концепт чистого кода - функция должна выполнять только одно действие, но случаи, в которых классы или функции содержат в себе оператор `if`, говорят пользователю о том, что функция может делать не только одно. Вы ведь помните, что так быть не должно.

**Плохо:**

```js
class Airplane {
	// ...
	getCruisingAltitude() {
		switch (this.type) {
			case "777":
				return this.getMaxAltitude() - this.getPassengerCount();
			case "Air Force One":
				return this.getMaxAltitude();
			case "Cessna":
				return this.getMaxAltitude() - this.getFuelExpenditure();
		}
	}
}
```

**Хорошо:**

```js
class Airplane {
	// ...
}

class Boeing777 extends Airplane {
	// ...
	getCruisingAltitude() {
		return this.getMaxAltitude() - this.getPassengerCount();
	}
}

class AirForceOne extends Airplane {
	// ...
	getCruisingAltitude() {
		return this.getMaxAltitude();
	}
}

class Cessna extends Airplane {
	// ...
	getCruisingAltitude() {
		return this.getMaxAltitude() - this.getFuelExpenditure();
	}
}
```

### Избегайте проверки типов **(часть 1)**

JavaScript слаботипизирован, что означает, что функции могут принимать аргументы любого типа. Иногда такая свобода выходит боком, и проверка типов в ваших функциях начинает казаться заманчивой, но есть множество способом избежать этого. Первое, что нужно учесть - согласованные API.

**Плохо:**

```js
function travelToTexas(vehicle) {
	if (vehicle instanceof Bicycle) {
		vehicle.pedal(this.currentLocation, new Location("texas"));
	} else if (vehicle instanceof Car) {
		vehicle.drive(this.currentLocation, new Location("texas"));
	}
}
```

**Хорошо:**

```js
function travelToTexas(vehicle) {
	vehicle.move(this.currentLocation, new Location("texas"));
}
```

### Избегайте проверки типов **(часть 2)**

Если вы работаете с примитивными значениями, вроде строк и целых чисел, и не можете использовать полиморфизм, но все равно нуждаетесь в проверке типов - подумайте над использованием TypeScript. Это отличная альтернатива, которая предоставляет вам статическую типизацию поверх стандартного синтаксиса JavaScript. Проблема с ручной проверкой типов в JavaScript в том, что для того, чтобы сделать это правильно, требуется слишком много лишних слов, чтобы полученная ложная «безопасность типов» не влияла на читабельности. Держите свой JavaScript код чистым, пишите хорошие тесты и получите хорошие кодревью. Или используйте TypeScript (который, как я сказал, великолепная альтернатива!).

**Плохо:**

```js
function combine(val1, val2) {
	if (
		(typeof val1 === "number" && typeof val2 === "number") ||
		(typeof val1 === "string" && typeof val2 === "string")
	) {
		return val1 + val2;
	}

	throw new Error("Must be of type String or Number");
}
```

**Хорошо:**

```js
function combine(val1, val2) {
	return val1 + val2;
}
```

### Не переоптимизируйте

Современные браузеры под капотом очень много работают над оптимизацией в рантайме. Чаще всего, если вы занимаетесь оптимизацией сами - вы просто тратите время впустую. Современные браузеры под капотом делают кучу оптимизаций в рантайме. [Есть хороший ресурс](https://github.com/petkaantonov/bluebird/wiki/Optimization-killers), который подскажет вам о месте, где оптимизации не хватает. Следите за ним, пока их не исправят, если исправят вовсе.

**Плохо:**

```js
// В старых браузерах, каждая итерация с некэшированным `list.length` будет дорого стоить
// поскольку `list.length` будет пересчитываться. В современных браузерах этот момент оптимизирован.
for (let i = 0, len = list.length; i < len; i++) {
	// ...
}
```

**Хорошо:**

```js
for (let i = 0; i < list.length; i++) {
	// ...
}
```

### Избавляйтесь от мертвого кода

Мертвый код ничем не лучше повторяющегося, и нет причин хранить его в кодовой базе. Если вы не вызываете его - избавьтесь от него! А, если он вам понадобится, то будет доступен в вашей истории версий.

**Плохо:**

```js
function oldRequestModule(url) {
	// ...
}

function newRequestModule(url) {
	// ...
}

const req = newRequestModule;
inventoryTracker("apples", req, "www.inventory-awesome.io");
```

**Хорошо:**

```js
function newRequestModule(url) {
	// ...
}

const req = newRequestModule;
inventoryTracker("apples", req, "www.inventory-awesome.io");
```

## Объекты и структуры данных

### Используйте геттеры и сеттеры

Чтобы получать данные из объектов лучше использовать геттеры и сеттеры, чем простой поиск свойств в объектах. Почему? Ну, вот список из нескольких причин:

- Когда вы хотите сделать нечто большее, чем просто получить свойство объекта, вам не придется искать и менять каждый метод.
- `set` делает добавление валидации проще.
- Инкапсулируется внутреннее представление.
- С геттерами и сеттерами проще добавлять логгирование и обработку ошибок.
- Вы можете лениво подгружать свойства вашего объекта, например, получая их из сервера.

**Плохо:**

```js
function makeBankAccount() {
	// ...

	return {
		balance: 0,
		// ...
	};
}

const account = makeBankAccount();
account.balance = 100;
```

**Хорошо:**

```js
function makeBankAccount() {
	// эта переменная приватная
	let balance = 0;

	// геттер, возвращая, делает ее публичной
	function getBalance() {
		return balance;
	}

	// сеттер, возвращая, делает ее публичной
	function setBalance(amount) {
		// ... валидируйте баланс перед обновлением
		balance = amount;
	}

	return {
		// ...
		getBalance,
		setBalance,
	};
}

const account = makeBankAccount();
account.setBalance(100);
```

### Добавляйте объектам приватные поля

Этого можно добиться с помощью замыканий (для ES5 и новее).

**Плохо:**

```js
const Employee = function (name) {
	this.name = name;
};

Employee.prototype.getName = function getName() {
	return this.name;
};

const employee = new Employee("John Doe");
console.log(`Employee name: ${employee.getName()}`); // Employee name: John Doe
delete employee.name;
console.log(`Employee name: ${employee.getName()}`); // Employee name: undefined
```

**Хорошо:**

```js
function makeEmployee(name) {
	return {
		getName() {
			return name;
		},
	};
}

const employee = makeEmployee("John Doe");
console.log(`Employee name: ${employee.getName()}`); // Employee name: John Doe
delete employee.name;
console.log(`Employee name: ${employee.getName()}`); // Employee name: John Doe
```

## Классы

### Предпочитайте **ES2015/ES6 классы простым ES5 функциям**

Для ES5 функций очень тяжело сделать читаемые наследования, конструкции и методы. Если вам нужно наследование (чего делать не стоит), тогда используйте классы ES2015/ES6. Однако, старайтесь использовать маленькие функции до того момента, пока не понадобятся более крупные и сложные объекты.

**Плохо:**

```js
const Animal = function (age) {
	if (!(this instanceof Animal)) {
		throw new Error("Instantiate Animal with `new`");
	}

	this.age = age;
};

Animal.prototype.move = function move() {};

const Mammal = function (age, furColor) {
	if (!(this instanceof Mammal)) {
		throw new Error("Instantiate Mammal with `new`");
	}

	Animal.call(this, age);
	this.furColor = furColor;
};

Mammal.prototype = Object.create(Animal.prototype);
Mammal.prototype.constructor = Mammal;
Mammal.prototype.liveBirth = function liveBirth() {};

const Human = function (age, furColor, languageSpoken) {
	if (!(this instanceof Human)) {
		throw new Error("Instantiate Human with `new`");
	}

	Mammal.call(this, age, furColor);
	this.languageSpoken = languageSpoken;
};

Human.prototype = Object.create(Mammal.prototype);
Human.prototype.constructor = Human;
Human.prototype.speak = function speak() {};
```

**Хорошо:**

```js
class Animal {
	constructor(age) {
		this.age = age;
	}

	move() {
		/* ... */
	}
}

class Mammal extends Animal {
	constructor(age, furColor) {
		super(age);
		this.furColor = furColor;
	}

	liveBirth() {
		/* ... */
	}
}

class Human extends Mammal {
	constructor(age, furColor, languageSpoken) {
		super(age, furColor);
		this.languageSpoken = languageSpoken;
	}

	speak() {
		/* ... */
	}
}
```

### Используйте цепочки методов

Для JavaScript этот паттерн очень полезен, и вы увидите его во множестве библиотек, например, в jQuery и Lodash. Он позволяет вашему коду был более выразительным и компактным. Попробуйте сами и посмотрите, насколько чище станет ваш код. Просто возвращайте `this` в конце каждой классовой функции, и сможете связать с ней другие методы класса.

**Плохо:**

```js
class Car {
	constructor(make, model, color) {
		this.make = make;
		this.model = model;
		this.color = color;
	}

	setMake(make) {
		this.make = make;
	}

	setModel(model) {
		this.model = model;
	}

	setColor(color) {
		this.color = color;
	}

	save() {
		console.log(this.make, this.model, this.color);
	}
}

const car = new Car("Ford", "F-150", "red");
car.setColor("pink");
car.save();
```

**Хорошо:**

```js
class Car {
	constructor(make, model, color) {
		this.make = make;
		this.model = model;
		this.color = color;
	}

	setMake(make) {
		this.make = make;
		// ПРИМЕЧАНИЕ: Возвращаем this для чейнинга
		return this;
	}

	setModel(model) {
		this.model = model;
		// ПРИМЕЧАНИЕ: Возвращаем this для чейнинга
		return this;
	}

	setColor(color) {
		this.color = color;
		// ПРИМЕЧАНИЕ: Возвращаем this для чейнинга
		return this;
	}

	save() {
		console.log(this.make, this.model, this.color);
		// ПРИМЕЧАНИЕ: Возвращаем this для чейнинга
		return this;
	}
}

const car = new Car("Ford", "F-150", "red").setColor("pink").save();
```

### Предпочитайте композицию наследованию

Как уже говорила Банда Четырёх в "_[Design Patterns](https://en.wikipedia.org/wiki/Design_Patterns)"_, вам следует предпочитать композицию наследованию в местах, где вы можете это сделать. Есть множество хороших причин использовать и то, и другое, но суть этого принципа в том, что если ваш ум инстинктивно стремится к наследованию, постарайтесь подумать, может ли композиция лучше моделировать вашу проблему. В некоторых случаях это возможно.

Вы можете думать, "Когда мне стоит начать использовать наследование?". Зависит от проблемы, которую вы решаете, но есть хороший список моментов, когда наследование будет иметь больше смысла, чем композиция:

1. Ваше наследование представляет собой отношения "является разновидностью", а не "включает в себя" (Человек->Животное против Пользователь->Детали_Пользователя).
2. Вы можете повторно использовать код из базовых классов (люди могут двигаться как и все животные).
3. Вы хотите сделать глобальные изменения в производных классах путем изменения базового класса (изменение расхода калорий всех животных во время движения).

**Плохо:**

```js
class Employee {
	constructor(name, email) {
		this.name = name;
		this.email = email;
	}
	// ...
}

// Плохо, потому что Employees хранит данные о налогах. EmployeeTaxData не является типом Employee
class EmployeeTaxData extends Employee {
	constructor(ssn, salary) {
		super();
		this.ssn = ssn;
		this.salary = salary;
	}
	// ...
}
```

**Хорошо:**

```js
class EmployeeTaxData {
	constructor(ssn, salary) {
		this.ssn = ssn;
		this.salary = salary;
	}
	// ...
}

class Employee {
	constructor(name, email) {
		this.name = name;
		this.email = email;
	}

	setTaxData(ssn, salary) {
		this.taxData = new EmployeeTaxData(ssn, salary);
	}
	// ...
}
```

## **SOLID**

### Принцип единственной ответственности (SRP)

Чистый код декларирует: "Не должно быть более чем одной причины для изменения класса". Заманчиво представить себе класс, переполненный большим количеством функционала, словно в поездку вам позволили взять всего один чемодан. Проблема в том, что ваш класс не будет концептуально единым и это даст ему множество причин для изменения. Имеет огромное значение свести к минимуму количество таких причин. Если сосредоточить слишком много функциональности в одном классе, а затем попытаться изменить его часть, то спрогнозировать, как это может сказаться на других модулях системы, станет крайне сложно.

П**лохо:**

```js
class UserSettings {
	constructor(user) {
		this.user = user;
	}

	changeSettings(settings) {
		if (this.verifyCredentials()) {
			// ...
		}
	}

	verifyCredentials() {
		// ...
	}
}
```

**Хорошо:**

```js
class UserAuth {
	constructor(user) {
		this.user = user;
	}

	verifyCredentials() {
		// ...
	}
}

class UserSettings {
	constructor(user) {
		this.user = user;
		this.auth = new UserAuth(user);
	}

	changeSettings(settings) {
		if (this.auth.verifyCredentials()) {
			// ...
		}
	}
}
```

### Принцип открытости/закрытости (OCP)

Как заявил Бертран Мейер, программные сущности (классы, модули, функции и т.д.) должны оставаться открытыми для расширения, но закрытыми для модификации. Что это означает на практике? Принцип закрепляет, что вы должны позволить пользователям добавлять новые функциональные возможности, но без изменения существующего кода.

**Плохо:**

```js
class AjaxAdapter extends Adapter {
	constructor() {
		super();
		this.name = "ajaxAdapter";
	}
}

class NodeAdapter extends Adapter {
	constructor() {
		super();
		this.name = "nodeAdapter";
	}
}

class HttpRequester {
	constructor(adapter) {
		this.adapter = adapter;
	}

	fetch(url) {
		if (this.adapter.name === "ajaxAdapter") {
			return makeAjaxCall(url).then((response) => {
				// обрабатываем и возвращаем response
			});
		} else if (this.adapter.name === "nodeAdapter") {
			return makeHttpCall(url).then((response) => {
				// обрабатываем и возвращаем response
			});
		}
	}
}

function makeAjaxCall(url) {
	// запрашиваем и возвращаем promise
}

function makeHttpCall(url) {
	// запрашиваем и возвращаем promise
}
```

**Хорошо:**

```js
class AjaxAdapter extends Adapter {
	constructor() {
		super();
		this.name = "ajaxAdapter";
	}

	request(url) {
		// запрашиваем и возвращаем promise
	}
}
class NodeAdapter extends Adapter {
	constructor() {
		super();
		this.name = "nodeAdapter";
	}
	request(url) {
		// запрашиваем и возвращаем promise
	}
}
class HttpRequester {
	constructor(adapter) {
		this.adapter = adapter;
	}
	fetch(url) {
		return this.adapter.request(url).then((response) => {
			// обрабатываем и возвращаем response
		});
	}
}
```

### Принцип подстановки Барбары Лисков (LSP)

Это страшный термин для очень простой концепции. Формальным языком он звучит следующим образом: "Если S является подтипом T, то объекты типа Т могут быть заменены на объекты типа S (то есть, объекты типа S могут заменить объекты типа Т) без влияния на важные свойства программы (корректность, пригодность для выполнения задач и т.д.). И да, в итоге определение получилось еще страшней.

Лучшее объяснение заключается в том, что если у вас есть родительский и дочерний классы, то они могут использоваться как взаимозаменяемые, не приводя при этом к некорректным результатам. Это по-прежнему может сбивать с толку, так что давайте взглянем на классический пример квадрата-прямоугольника. Математически квадрат представляет собой прямоугольник, но если вы смоделируете их отношения через наследование ("является разновидностью"), вы быстро наткнетесь на неприятности.

**Плохо:**

```js
class Rectangle {
	constructor() {
		this.width = 0;
		this.height = 0;
	}

	setColor(color) {
		// ...
	}

	render(area) {
		// ...
	}

	setWidth(width) {
		this.width = width;
	}

	setHeight(height) {
		this.height = height;
	}

	getArea() {
		return this.width * this.height;
	}
}

class Square extends Rectangle {
	setWidth(width) {
		this.width = width;
		this.height = width;
	}

	setHeight(height) {
		this.width = height;
		this.height = height;
	}
}

function renderLargeRectangles(rectangles) {
	rectangles.forEach((rectangle) => {
		rectangle.setWidth(4);
		rectangle.setHeight(5);

		const area = rectangle.getArea();
		// ПЛОХО: Для Square вернется 25, а должно 20.
		rectangle.render(area);
	});
}

const rectangles = [new Rectangle(), new Rectangle(), new Square()];
renderLargeRectangles(rectangles);
```

**Хорошо:**

```js
class Shape {
	setColor(color) {
		// ...
	}

	render(area) {
		// ...
	}
}

class Rectangle extends Shape {
	constructor(width, height) {
		super();
		this.width = width;
		this.height = height;
	}

	getArea() {
		return this.width * this.height;
	}
}

class Square extends Shape {
	constructor(length) {
		super();
		this.length = length;
	}

	getArea() {
		return this.length * this.length;
	}
}

function renderLargeShapes(shapes) {
	shapes.forEach((shape) => {
		const area = shape.getArea();
		shape.render(area);
	});
}

const shapes = [new Rectangle(4, 5), new Rectangle(4, 5), new Square(5)];
renderLargeShapes(shapes);
```

### Принцип разделения интерфейса (ISP)

JavaScript не имеет интерфейсов, так что этот принцип не применяется так строго, как другие. Тем не менее, это важно и актуально даже в виду их отсутствия.

Принцип утверждает, что клиенты не должны зависеть от интерфейсов, которые они не используют. Из-за утиной типизации, в JavaScript интерфейсы - это неявные контракты.

Хорошим примером станут классы, предусматривающие множество настроек для объектов. Полезно не требовать от клиентов проставления их всех, потому что большую часть времени все они не требуются. Создание опциональных настроек помогает предотвратить разбухание интерфейса.

**Плохо:**

```js
class DOMTraverser {
	constructor(settings) {
		this.settings = settings;
		this.setup();
	}

	setup() {
		this.rootNode = this.settings.rootNode;
		this.animationModule.setup();
	}

	traverse() {
		// ...
	}
}

const $ = new DOMTraverser({
	rootNode: document.getElementsByTagName("body"),
	animationModule() {},
	// Анимация не понадобится в большинстве случаев.
	// ...
});
```

**Хорошо:**

```js
class DOMTraverser {
	constructor(settings) {
		this.settings = settings;
		this.options = settings.options;
		this.setup();
	}

	setup() {
		this.rootNode = this.settings.rootNode;
		this.setupOptions();
	}

	setupOptions() {
		if (this.options.animationModule) {
			// ...
		}
	}

	traverse() {
		// ...
	}
}

const $ = new DOMTraverser({
	rootNode: document.getElementsByTagName("body"),
	options: { animationModule() {} },
});
```

### Принцип инверсии зависимостей (DIP)

Этот принцип закрепляет две важные вещи:

1. Модули верхнего уровня не должны зависеть от модулей низкого уровня. И те, и другие должны зависеть от абстракций.
2. Абстракции не должны зависеть от деталей. Детали должны зависеть от абстракций.

На первый взгляд это кажется трудным, но если вы работали с Angular.js, вы видели реализацию этого принципа в виде внедрения зависимостей (Dependency Injection - DI). Несмотря на то, что DIP и DI - понятия не идентичные, DIP оберегает модули верхнего уровня от деталей модулей низкого уровня, а сделать это он может через DI. Огромное преимущество DIP в уменьшении взаимосвязей между модулями. Переплетение модулей - это антипаттерн, потому что оно делает рефакторинг вашего кода гораздо более трудоемким.

Как было сказано выше, JavaScript не имеет интерфейсов, так что абстракции зависят от неявных контрактов. То есть, от методов и свойств, которые объект/класс предоставляет другому объекту/классу. В приведенном ниже примере, неявный контракт в том, что любой модуль запроса для `InventoryTracker` будет иметь метод `requestItems`.

**Плохо:**

```js
class InventoryRequester {
	constructor() {
		this.REQ_METHODS = ["HTTP"];
	}

	requestItem(item) {
		// ...
	}
}

class InventoryTracker {
	constructor(items) {
		this.items = items;
		// ПЛОХО: Мы создали зависимость от конкретной реализации запроса.
		// requestItems должен зависеть только от метода `request`
		this.requester = new InventoryRequester();
	}

	requestItems() {
		this.items.forEach((item) => {
			this.requester.requestItem(item);
		});
	}
}

const inventoryTracker = new InventoryTracker(["apples", "bananas"]);
inventoryTracker.requestItems();
```

**Хорошо:**

```js
class InventoryTracker {
	constructor(items, requester) {
		this.items = items;
		this.requester = requester;
	}

	requestItems() {
		this.items.forEach((item) => {
			this.requester.requestItem(item);
		});
	}
}

class InventoryRequesterV1 {
	constructor() {
		this.REQ_METHODS = ["HTTP"];
	}

	requestItem(item) {
		// ...
	}
}

class InventoryRequesterV2 {
	constructor() {
		this.REQ_METHODS = ["WS"];
	}

	requestItem(item) {
		// ...
	}
}

// Построив наши зависимости извне и внедряя их, мы можем легко
// заменить наш модуль запроса на модный, например, использующий WebSockets.
const inventoryTracker = new InventoryTracker(
	["apples", "bananas"],
	new InventoryRequesterV2(),
);
inventoryTracker.requestItems();
```

## Тестирование

Тестирование гораздо важнее разворачивания кода. Если у вас нет тестов или их мало, то при каждой отправке кода на сервера вы не можете быть уверены что ничего не сломалось. Решение о достаточном количестве тестов остается на совести вашей команды, но 100% покрытие тестами всех выражений и ветвлений обеспечивает высокое доверие к вашему коду и спокойствие всех разработчиков. Из этого следует, что в дополнение к отличному фреймворку для тестирования, необходимо также использовать [хороший инструмент покрытия](https://gotwarlost.github.io/istanbul/).

Нет оправдания не писать тесты. Для JavaScript существует множество [хороших тестовых фреймворков](https://jstherightway.org/#testing-tools), так что найдите подходящий для вас. А когда найдете, то стремитесь писать тесты для каждой новой фичи или нового модуля. Замечательно, если вы предпочитаете метод Разработки через тестирование (TDD), но главное убедиться, что перед запуском любой новой фичи или рефакторинга существующей вы достигаете достаточного уровня покрытия тестами.

### Один кейс на один тест

**Плохо:**

```js
import assert from "assert";

describe("MomentJS", () => {
	it("handles date boundaries", () => {
		let date;

		date = new MomentJS("1/1/2015");
		date.addDays(30);
		assert.equal("1/31/2015", date);

		date = new MomentJS("2/1/2016");
		date.addDays(28);
		assert.equal("02/29/2016", date);

		date = new MomentJS("2/1/2015");
		date.addDays(28);
		assert.equal("03/01/2015", date);
	});
});
```

**Хорошо:**

```js
import assert from "assert";

describe("MomentJS", () => {
	it("handles 30-day months", () => {
		const date = new MomentJS("1/1/2015");
		date.addDays(30);
		assert.equal("1/31/2015", date);
	});

	it("handles leap year", () => {
		const date = new MomentJS("2/1/2016");
		date.addDays(28);
		assert.equal("02/29/2016", date);
	});

	it("handles non-leap year", () => {
		const date = new MomentJS("2/1/2015");
		date.addDays(28);
		assert.equal("03/01/2015", date);
	});
});
```

## Асинхронность

### Используйте **Promises, а не коллбэки**

Коллбэки ухудшают читаемость и приводят к чрезмерному количеству вложенности. В ES2015/ES6 Promises - встроенный глобальный тип. Используйте их!

**Плохо:**

```js
import { get } from "request";
import { writeFile } from "fs";

get(
	"https://en.wikipedia.org/wiki/Robert_Cecil_Martin",
	(requestErr, response, body) => {
		if (requestErr) {
			console.error(requestErr);
		} else {
			writeFile("article.html", body, (writeErr) => {
				if (writeErr) {
					console.error(writeErr);
				} else {
					console.log("File written");
				}
			});
		}
	},
);
```

**Хорошо:**

```js
import { get } from "request-promise";
import { writeFile } from "fs-extra";

get("https://en.wikipedia.org/wiki/Robert_Cecil_Martin")
	.then((body) => {
		return writeFile("article.html", body);
	})
	.then(() => {
		console.log("File written");
	})
	.catch((err) => {
		console.error(err);
	});
```

### **Async/Await еще чище, чем Promises**

Промисы - очень чистая альтернатива callback-функциям, но ES2017/ES8 привносит async и await с еще более чистым решением. Все, что вам нужно, это функция с ключевым словом `async`, после чего вы можете писать логику императивно - без цепочек `then`. Если уже сегодня вы можете внедрить фичи ES2017/ES8, используйте async/await!

**Плохо:**

```js
import { get } from "request-promise";
import { writeFile } from "fs-extra";

get("https://en.wikipedia.org/wiki/Robert_Cecil_Martin")
	.then((body) => {
		return writeFile("article.html", body);
	})
	.then(() => {
		console.log("File written");
	})
	.catch((err) => {
		console.error(err);
	});
```

**Хорошо:**

```js
import { get } from "request-promise";
import { writeFile } from "fs-extra";

async function getCleanCodeArticle() {
	try {
		const body = await get("https://en.wikipedia.org/wiki/Robert_Cecil_Martin");
		await writeFile("article.html", body);
		console.log("File written");
	} catch (err) {
		console.error(err);
	}
}

getCleanCodeArticle();
```

## Обработка ошибок

Выброшенные ошибки - отличная штука! Они говорят о том, что рантайм успешно определил проблему и дал вам знать об этом, остановив выполнение функции и остановив процесс (в случае Node.js).

### Не игнорируйте пойманные ошибки

Игнорирование пойманной ошибки не дает вам возможности исправить или каким-либо образом отреагировать на ее появление. Логгирование ошибок в консоль (`console.log`) не намного лучше, так как зачастую оно может потеряться в море консольных записей. Оборачивание куска кода в `try/catch` означает, что вы предполагаете возможность появления ошибки и имеете на этот случай четкий план.

**Плохо:**

```js
try {
	functionThatMightThrow();
} catch (error) {
	console.log(error);
}
```

**Хорошо:**

```js
try {
	functionThatMightThrow();
} catch (error) {
	// Один из вариантов (более выделяющийся, чем console.log):
	console.error(error);

	// Еще один вариант:
	notifyUserOfError(error);

	// И еще один:
	reportErrorToService(error);

	// ИЛИ используйте все три!
}
```

### Не игнорируйте выполненные с ошибкой promises

По той же причине вам не стоит игнорировать ошибки в `try/catch`.

**Плохо:**

```js
getdata()
	.then((data) => {
		functionThatMightThrow(data);
	})
	.catch((error) => {
		console.log(error);
	});
```

**Хорошо:**

```js
getdata()
	.then((data) => {
		functionThatMightThrow(data);
	})
	.catch((error) => {
		// Один из вариантов (более выделяющийся, чем console.log):
		console.error(error);

		// Еще один вариант:
		notifyUserOfError(error);

		// И еще один:
		reportErrorToService(error);

		// ИЛИ используйте все три!
	});
```

## Оформление

Оформление субъективно. Как и во многом собранном здесь, в вопросе форматирования нет жестких правил, которым вы обязаны следовать. Главное, НЕ ТРАТИТЬ ВРЕМЯ НА СПОРЫ о нем. Есть [множество инструментов](https://standardjs.com/rules.html) для автоматизации этого процесса. Выбирайте любой! Споры о форматировании - пустая трата времени и денег.

Для случаев, не подходящих для автоматического форматирования (отступы, табуляция или пробелы, двойные кавычки против одинарных и т.д.), в данном руководстве содержатся лучшие практики.

### Используйте верхний регистр последовательно

JavaScript слаботипизирован, потому имена в верхних регистрах смогут сказать много чего о ваших переменных, функциях и прочем. Эти правила также субъективны, потому ваша команда может подобрать их сама. Суть в том, чтобы быть последовательными, независимо от того, какой метод вы выбрали.

**Плохо:**

```js
const DAYS_IN_WEEK = 7;
const daysInMonth = 30;

const songs = ["Back In Black", "Stairway to Heaven", "Hey Jude"];
const Artists = ["ACDC", "Led Zeppelin", "The Beatles"];

function eraseDatabase() {}
function restore_database() {}

class animal {}
class Alpaca {}
```

**Хорошо:**

```js
const DAYS_IN_WEEK = 7;
const DAYS_IN_MONTH = 30;

const SONGS = ["Back In Black", "Stairway to Heaven", "Hey Jude"];
const ARTISTS = ["ACDC", "Led Zeppelin", "The Beatles"];

function eraseDatabase() {}
function restoreDatabase() {}

class Animal {}
class Alpaca {}
```

### Вызывающая и вызываемая функции должны быть рядом

Если функция вызывает другую, сохраняйте эти функции вертикально рядом в исходном файле. В идеале, держите вызывающую функцию прямо над вызываемой. Мы склонны читать код сверху-внизу, как газету. Поэтому подготавливайте ваш код для восприятия таким образом.

**Плохо:**

```js
class PerformanceReview {
	constructor(employee) {
		this.employee = employee;
	}

	lookupPeers() {
		return db.lookup(this.employee, "peers");
	}

	lookupManager() {
		return db.lookup(this.employee, "manager");
	}

	getPeerReviews() {
		const peers = this.lookupPeers();
		// ...
	}

	perfReview() {
		this.getPeerReviews();
		this.getManagerReview();
		this.getSelfReview();
	}

	getManagerReview() {
		const manager = this.lookupManager();
	}

	getSelfReview() {
		// ...
	}
}

const review = new PerformanceReview(employee);
review.perfReview();
```

**Хорошо:**

```js
class PerformanceReview {
	constructor(employee) {
		this.employee = employee;
	}

	perfReview() {
		this.getPeerReviews();
		this.getManagerReview();
		this.getSelfReview();
	}

	getPeerReviews() {
		const peers = this.lookupPeers();
		// ...
	}

	lookupPeers() {
		return db.lookup(this.employee, "peers");
	}

	getManagerReview() {
		const manager = this.lookupManager();
	}

	lookupManager() {
		return db.lookup(this.employee, "manager");
	}

	getSelfReview() {
		// ...
	}
}

const review = new PerformanceReview(employee);
review.perfReview();
```

## Комментарии

### Комментируйте моменты со сложной бизнес-логикой**.**

Комментарии - оправдания и не являются обязательным требованием. Хороший код в основном документирует себя сам.

**Плохо:**

```js
function hashIt(data) {
	// хэш
	let hash = 0;

	// длина строки
	const length = data.length;

	// Проход по каждому символу в data
	for (let i = 0; i < length; i++) {
		// Получение кода символа.
		const char = data.charCodeAt(i);
		// Создание хэша
		hash = (hash << 5) - hash + char;
		// Конвертация в 32-битное целое число
		hash &= hash;
	}
}
```

**Хорошо:**

```js
function hashIt(data) {
	let hash = 0;
	const length = data.length;

	for (let i = 0; i < length; i++) {
		const char = data.charCodeAt(i);
		hash = (hash << 5) - hash + char;

		// Конвертация в 32-битное целое число
		hash &= hash;
	}
}
```

### Не оставляйте закомментированный код в вашей кодовой базе

Системы контроля версий не просто так существуют. Оставляйте старый код в истории.

**Плохо:**

```js
doStuff();
// doOtherStuff();
// doSomeMoreStuff();
// doSoMuchStuff();
```

**Хорошо:**

```js
doStuff();
```

### Не заводите журнальных комментариев

Не забывайте использовать системы контроля версий! Нет необходимости в мертвом коде, закомментированном коде и особенно в журнальных комментариях. Используйте `git log`, чтобы получить историю!

**Плохо:**

```js
/**
 * 2016-12-20: Убрал монады, не понимал их (RM)
 * 2016-10-01: Усовершенствовал использование специальных монад (JP)
 * 2016-02-03: Убрал проверку типов (LI)
 * 2015-03-14: Добавил combine с проверкой типов (JR)
 */

function combine(a, b) {
	return a + b;
}
```

**Хорошо:**

```js
function combine(a, b) {
	return a + b;
}
```

### Избегайте маркеров позиционирования

Они, как правило, просто добавляют шум. Пусть функции и имена переменных вместе с правильными отступами и форматированием задают визуальную структуру кода.

**Плохо:**

```js
////////////////////////////////////////////////////////////////////////////////
// Создание объекта scope
////////////////////////////////////////////////////////////////////////////////
$scope.model = {
	menu: "foo",
	nav: "bar",
};

////////////////////////////////////////////////////////////////////////////////
// Создание экшена
////////////////////////////////////////////////////////////////////////////////
const actions = function () {
	// ...
};
```

**Хорошо:**

```js
$scope.model = {
	menu: "foo",
	nav: "bar",
};

const actions = function () {
	// ...
};
```
