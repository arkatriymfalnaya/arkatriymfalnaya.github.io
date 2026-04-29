---
title: генерируем xlsx из rss фида
description: генерируем xlsx из rss фида
keywords: nodejs xlsx rss
date: 2025-05-24
tags: ["nodejs", "rss", "scripts", "bash", "webdev"]
---

нагулял задачу генерации таблиц из rss фида, парсеры выходят на арену. план такой: из терминала кормим скрипт набором аргументов с линком к rss фиду и его настройками, добавляем прогресс бары для отзывчивости, на выход отдаем сгенерированную таблицу.

сперва набросаем пачку зависимостей:

```js
yarn add rss-parser
yarn add --dev exceljs moment posthtml progress request request-promise yargs
```

за дело! импортирую переменные и определяю парсер:

```js
const ExcelJS = require("exceljs");
const Parser = require("rss-parser");
const posthtml = require("posthtml");
const rp = require("request-promise");
const moment = require("moment");
const ProgressBar = require("progress");
const yargs = require("yargs");

const parser = new Parser();
```

описываю обязательные и не очень аргументы, определяю входную функцию и на ходу рассказываю о прогрессе в терминал:

```js
const options = yargs
	.usage(`Usage: -f <rss uri>`)
	.option("f", {
		alias: "feed",
		describe: "RSS feed uri",
		type: "string",
		demandOption: true,
	})
	.option("a", {
		alias: "amount",
		describe: "Needed RSS feed posts amount",
		type: "string",
	})
	.option("n", {
		alias: "outputFileName",
		describe: "XLS output file name",
		type: "string",
	})
	.option("o", {
		alias: "cellOptions",
		describe: "Sheet cell additional options",
		type: "array",
	}).argv;

process.stdout.write(`great options, bruh, let's start already!\n`);

entry(
	options.feed,
	options.amount,
	options.outputFileName,
	options.cellOptions,
);
```

главная функция будет принимать на вход обязательный линк на фид и необязательные количество постов, имя таблицы на выходе и набор кастомных настроек для ячеек. назначаю нужные столбцы и их ключи:

```js
let entry = async (
	rssFeed,
	amount = 5,
	outputFileName = "result",
	cellOptions = [],
) => {
	process.stdout.write(`parsing your rss feed...\n`);
	let feed = await parser.parseURL(rssFeed);

	process.stdout.write(`creating excel workbook...\n`);
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet(outputFileName);
	worksheet.columns = [
		{
			header: "text",
			key: "col_text",
		},
		{
			header: "url",
			key: "col_url",
		},
		{
			header: "images",
			key: "col_images",
		},
		{
			header: "time",
			key: "col_time",
		},
	];
};
```

приступаю к генерации новых строк и добавляю тикающий прогресс бар:

```js
process.stdout.write(`generating posts from rss feed...\n`);
let generatedRows = await generatePostsMetaFromFeed(feed, amount);
let generatedRowsBar = new ProgressBar(
	"[:bar] :current/:total table rows generated\n",
	{
		incomplete: " ",
		complete: "#",
		total: generatedRows.length,
	},
);
```

функция `generatePostsMetaFromFeed` займется пирсингом элементов фида и генерацией набора с нужными таблице полями:

```js
let convertFeedToPosts = (feed) => [...feed.items.map((item) => item.link)]; // для пагинации по страницам фида понадобятся линки

let generatePostsMetaFromFeed = async (feed, amount) => {
	let res = [];

	let posts = [];
	let feedLink = feed.link;

	if (amount > 10) {
		process.stdout.write(`wow, so much posts? taking care of it...\n`);
		let pages = Math.round(amount / 10); // пагинация для доступа к последующим страницам фида
		let pagesLoadingBar = new ProgressBar(
			"[:bar] :current/:total processed\n",
			{
				incomplete: " ",
				complete: "#",
				total: pages,
			},
		);

		posts.push(...convertFeedToPosts(feed));

		process.stdout.write(`loading needed pages...\n`);
		for (let i = 2; i <= pages; i++) {
			await rp(encodeURI(`${feedLink}?feed=rss&paged=${i}`))
				.then(async (rssPage) => {
					let parsedRSSFeed = await parser.parseString(rssPage);
					let isLastPage = i === pages;

					if (isLastPage) {
						let modItems = parsedRSSFeed.items.filter(
							(_, index) => index < amount % 10,
						);

						posts.push(
							...convertFeedToPosts({
								items: modItems,
							}),
						);
					} else {
						posts.push(...convertFeedToPosts(parsedRSSFeed));
					}

					pagesLoadingBar.tick();
				})
				.catch((err) => {
					console.error("huh, rss pagination failed", err.code);
				});
		}
	} else {
		process.stdout.write(`not a lot of posts, gonna be quick!\n`);
		posts.push(
			...convertFeedToPosts({
				items: feed.items.slice(0, amount),
			}),
		);
	}

	process.stdout.write(`time to generate some text for our table!\n`);
	let postsHandlingBar = new ProgressBar(
		"[:bar] :current/:total posts handled\n",
		{
			incomplete: " ",
			complete: "#",
			total: posts.length,
		},
	);

	for (let i = 0; i < posts.length; i++) {
		let postLink = posts[i];
		let title, description, image;

		await rp(postLink)
			.then((html) => {
				process.stdout.write(`wuush, working on it...\n`);
				posthtml()
					.use((tree) => {
						// парсим дерево и только нужные таблице значения нод
						tree.match(
							{
								tag: "title",
							},
							(node) => {
								title = node.content[0];
							},
						);
						tree.match(
							{
								attrs: {
									name: "description",
								},
								tag: "meta",
							},
							(node) => {
								description = node.attrs.content;
							},
						);
						tree.match(
							{
								attrs: {
									property: "og:image",
								},
								tag: "meta",
							},
							(node) => {
								image = node.attrs.content;
							},
						);
					})
					.process(html);

				postsHandlingBar.tick();
			})
			.catch((err) => {
				console.error("huh, post parsing failed", err);
			});

		res.push({
			title,
			description,
			image,
			link: postLink,
		});
	}

	return res;
};
```

строки сгенерированы, пора вернуться во входную `entry` функцию и прикрутить их к инстансу `worksheet`, используя метод `addRow`:

```js
process.stdout.write(`making some rows for your sheet...\n`);
for (let i = 0; i < generatedRows.length; i++) {
	let { title, description, image, link } = generatedRows[i];
	let columnText = `${title}\n\n${description}\n\n${link}`;

	if (cellOptions.length) {
		cellOptions.forEach((cOption) => {
			if (cOption === "noImage") {
				image = "";
			}
			if (cOption === "noOGCard") {
				link = "";
			}
		});
	}

	worksheet.addRow({
		col_text: columnText,
		col_url: link,
		col_images: image,
		col_time: moment().add(i, "days").format("DD/MM/YYYY hh:mm").toString(),
	});

	generatedRowsBar.tick();
}
```

lift off! теперь можно отдавать таблицу:

```js
process.stdout.write(`creating your ${outputFileName} file...\n`);
await workbook.xlsx
	.writeFile(`${outputFileName}.xlsx`)
	.then(() => {
		process.stdout.write(`${outputFileName} created allright!\n`);
	})
	.catch((err) => {
		process.stdout.write("huh, creating error: ", err);
	});

process.stdout.write(`all done, love!\n`);
```

profit!

[source code](https://github.com/arkatriymfalnaya/xlsx-from-rss-generator)
