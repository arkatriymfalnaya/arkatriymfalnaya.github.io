---
title: как я "избавлялся от экстремизма" в блоге
description:
keywords: javascript frontend nodejs tutorial
date: 2025-01-12
tags: ["tutorial", "nodejs", "bash", "scripts", "webdev"]
---

по мотивам недавних судебных решений блог моей компании о соцсетях и вокруг попадал под длящееся правонарушение. неопределенность по поводу нужных действий от других компаний и отсутствие решения суда сбивало с толку, потому, прежде чем скрывать все статьи с упоминаниями продуктов компании M\*\*a, было решено подстраховаться иноагентскими методами.

первым вариантом был скрипт, которому можно скормить статьи и регуляркой добавить сноски всем упоминаниям экстремистских продуктов. с этой идеи начал, этой идеей и закончил.

wordpress хранит статьи в базе, доступ из админки по вкладке `записи`. встроенные инструменты позволяют экспортировать и импортировать контент из базы в удобном `xml` формате, осталось разобраться со структурой. для парсинга разогнал библиотеку `fast-xml-parser`:

```js
const data = fs.readFileSync(path.join(__dirname, fileName), "utf8");
const parser = new XMLParser();

let jObj = parser.parse(data);
```

рассмотрев дерево, выделил нужные мне ветки: `wp:postmeta` и `content:encoded`, дело за малым. пишем простую регулярку, выискивающую подстроку, которая не начинается с символа `[` (используется для markdown тегов), имеет одно вхождение из набора названий запрещенных продуктов `(название1|название2|название3)` и любое окончание для русской вариации `[а-яА-Я]*`. для туллтипов использовался wordpress плагин [Shortcodes Ultimate](https://getshortcodes.com/docs/). поскольку реплейсить придется для нескольких веток, выносим эту исторую в отдельную функцию и обрабатываем корнер кейсы:

```js
let replaceWithToolbar = (str) =>
	str.replace(
		/[^\[|\/](meta|instagram|facebook|инстаграм|мета|фейсбук)[а-яА-Я]*/gi,
		(subStr, _, subStrIndex) => {
			let nextSymbol = str[subStrIndex + subStr.length];

			if (
				str[subStrIndex - 3] +
					str[subStrIndex - 2] +
					str[subStrIndex - 1] +
					str[subStrIndex] ===
				"www."
			)
				return subStr;

			let space = '<code style="letter-spacing: -7px;"> </code>';

			let start = subStr[0];
			let end = nextSymbol === " " ? space : "";
			let updatedStr = subStr.substring(1);

			let tooltipText =
				subStr.includes("нстагра") ||
				subStr.includes("ейсб") ||
				subStr.includes("nstagr") ||
				subStr.includes("aceboo")
					? "Продукт принадлежит организации, признанной экстремистской на территории Российской Федерации."
					: "Организация признана экстремистской на территории Российской Федерации.";

			return `${start}${space}[su_tooltip text="${tooltipText}" text_align="center"]${updatedStr}[/su_tooltip]${end}`;
		},
	);
```

остается только грязно обновить исходные ветки на получившиеся:

```js
let metasArray = jObj.rss.channel.item["wp:postmeta"];
let newMetasArray = metasArray.map((m) => {
	if (
		m["wp:meta_key"] === "_crb_description" ||
		m["wp:meta_key"] === "_crb_short_description"
	) {
		let newMeta = replaceWithToolbar(m["wp:meta_value"]);
		m["wp:meta_value"] = newMeta;
	}

	return m;
});
jObj.rss.channel.item["wp:postmeta"] = newMetasArray;

let content = jObj.rss.channel.item["content:encoded"];
let newContent = replaceWithToolbar(content);
jObj.rss.channel.item["content:encoded"] = newContent;
```

после чего билдим дерево в новый xml и пишем в файл:

```js
const builder = new XMLBuilder({ processEntities: false });
const xmlContent = builder.build(jObj);
fs.writeFileSync(path.join(__dirname, `output_${fileName}`), xmlContent);
```

ну, вроде подстраховались!

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/nieiz68ro34yviib8bwe.png)

[source code](https://github.com/arkatriymfalnaya/avoid-extremism)
