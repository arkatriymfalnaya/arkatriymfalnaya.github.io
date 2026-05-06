---
title: лучшие практики react для агентов [перевод]
description:
keywords:
date: 2026-05-06
tags: ["computer_science", "javascript", "reactjs", "переводы"]
---

{% raw %}

вольный перевод статьи от Vercel Engineering "[React Best Practices v1.0.0](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/AGENTS.md)"

# лучшие практики react

**версия 1.0.0**  
vercel engineering  
январь 2026

> **примечание:**  
> этот документ в первую очередь для llm и агентов, которые поддерживают, генерируют или рефакторят react/next.js код. людям он тоже может быть полезен, но ориентирован на автоматизацию и единообразие.

## о чём речь

практическое руководство по оптимизации react/next.js приложений. внутри — 40+ правил, разбитых на 8 категорий, с приоритетами от критичных (убить водопады, уменьшить бандл) до продвинутых паттернов. у каждого правила — подробное объяснение, сравнение неправильных и правильных примеров и метрики эффекта.

---

## 1. убираем водопады

**влияние: критичное**

водопады — главный убийца скорости. каждый последовательный `await` добавляет полную задержку сети. убрав их, получишь наибольший прирост.

### 1.1 проверяй дешёвые условия до асинхронных флагов

**влияние: высокое (избегаем лишней асинхронной работы, если синхронная проверка отваливается)**

если внутри условия есть `await` и при этом дешёвое синхронное условие (локальные пропсы, уже загруженные данные) — проверяй сначала его. иначе заплатишь за асинхронный вызов, даже когда составное условие всё равно не выполнится.

**❌ неправильно:**

```js
const someFlag = await getFlag();

if (someFlag && someCondition) {
	// ...
}
```

**✅ правильно:**

```js
if (someCondition) {
	const someFlag = await getFlag();
	if (someFlag) {
		// ...
	}
}
```

это важно, когда `getFlag` ходит в сеть, к feature-флагам или в бд: если `someCondition` ложный, мы экономим этот вызов.

оставляй исходный порядок, если `someCondition` сам тяжёлый, зависит от флага или важен фиксированный порядок сайд-эффектов.

### 1.2 откладывай await до реального использования

**влияние: высокое (не блокируем ненужные пути кода)**

переноси `await` внутрь веток, где он реально нужен, чтобы не блокировать код, который его не требует.

**❌ неправильно: блокирует обе ветки**

```js
async function handleRequest(userId: string, skipProcessing: boolean) {
	const userData = await fetchUserData(userId);

	if (skipProcessing) {
		// возвращаем мгновенно, но всё равно ждали userData
		return { skipped: true };
	}

	// только эта ветка использует userData
	return processUserData(userData);
}
```

**✅ правильно: ждём только когда нужно**

```js
async function handleRequest(userId: string, skipProcessing: boolean) {
	if (skipProcessing) {
		// возврат без ожидания
		return { skipped: true };
	}

	// fetch только когда понадобилось
	const userData = await fetchUserData(userId);
	return processUserData(userData);
}
```

**ещё пример: ранний возврат**

```js
// ❌ неправильно: всегда фетчим права
async function updateResource(resourceId: string, userId: string) {
	const permissions = await fetchPermissions(userId);
	const resource = await getResource(resourceId);

	if (!resource) {
		return { error: "не найдено" };
	}

	if (!permissions.canEdit) {
		return { error: "доступ запрещён" };
	}

	return await updateResourceData(resource, permissions);
}

// ✅ правильно: фетчим только при необходимости
async function updateResource(resourceId: string, userId: string) {
	const resource = await getResource(resourceId);

	if (!resource) {
		return { error: "не найдено" };
	}

	const permissions = await fetchPermissions(userId);

	if (!permissions.canEdit) {
		return { error: "доступ запрещён" };
	}

	return await updateResourceData(resource, permissions);
}
```

эта оптимизация особенно ценна, если пропускаемая ветка встречается часто или откладываемая операция дорогая.

### 1.3 распараллеливание на основе зависимостей

**влияние: критичное (прирост в 2–10 раз)**

если операции имеют частичные зависимости, используй `better-all`, чтобы выжать максимум параллельности. он сам запускает каждую задачу в самый ранний возможный момент.

**❌ неправильно: profile ждёт config, хотя мог бы не ждать**

```js
const [user, config] = await Promise.all([fetchUser(), fetchConfig()]);
const profile = await fetchProfile(user.id);
```

**✅ правильно: config и profile параллельны**

```js
import { all } from "better-all";

const { user, config, profile } = await all({
	async user() {
		return fetchUser();
	},
	async config() {
		return fetchConfig();
	},
	async profile() {
		return fetchProfile((await this.$.user).id);
	},
});
```

**альтернатива без лишних зависимостей:**

```js
const userPromise = fetchUser();
const profilePromise = userPromise.then((user) => fetchProfile(user.id));

const [user, config, profile] = await Promise.all([
	userPromise,
	fetchConfig(),
	profilePromise,
]);
```

можно сначала создать все промисы, а в конце сделать `Promise.all()`.

### 1.4 не строй цепочки водопадов в api-роутах

**влияние: критичное (прирост в 2–10 раз)**

в api-роутах и server actions запускай независимые операции немедленно, даже если не ждёшь их прямо сейчас.

**❌ неправильно: config ждёт auth, data ждёт обоих**

```js
export async function GET(request: Request) {
	const session = await auth();
	const config = await fetchConfig();
	const data = await fetchData(session.user.id);
	return Response.json({ data, config });
}
```

**✅ правильно: auth и config стартуют сразу**

```js
export async function GET(request: Request) {
	const sessionPromise = auth();
	const configPromise = fetchConfig();
	const session = await sessionPromise;
	const [config, data] = await Promise.all([
		configPromise,
		fetchData(session.user.id),
	]);
	return Response.json({ data, config });
}
```

### 1.5 promise.all() для независимых операций

**влияние: критичное (прирост в 2–10 раз)**

когда асинхронные операции не зависят друг от друга, запускай их параллельно через `Promise.all()`.

\*\*❌ неправильно: последовательно

```js
const user = await fetchUser();
const posjs = await fetchPosjs();
const commenjs = await fetchCommenjs();
```

\*\*✅ правильно: параллельно

```js
const [user, posjs, commenjs] = await Promise.all([
	fetchUser(),
	fetchPosjs(),
	fetchCommenjs(),
]);
```

### 1.6 стратегические границы suspense

**влияние: высокое (более быстрая отрисовка обёртки)**

вместо того чтобы ждать данные в асинхронных компонентах до возврата jsx, используй suspense-границы — так обёртка покажется быстрее, пока грузятся данные.

**❌ неправильно: обёртка заблокирована фетчингом**

```js
async function Page() {
	const data = await fetchData(); // блокирует всю страницу

	return (
		<div>
			<div>сайдбар</div>
			<div>шапка</div>
			<div>
				<DataDisplay data={data} />
			</div>
			<div>футер</div>
		</div>
	);
}
```

весь лейаут ждёт данные, хотя нужны они только средней секции.

**✅ правильно: обёртка показывается сразу, данные подтягиваются позже**

```js
function Page() {
	return (
		<div>
			<div>сайдбар</div>
			<div>шапка</div>
			<div>
				<Suspense fallback={<Skeleton />}>
					<DataDisplay />
				</Suspense>
			</div>
			<div>футер</div>
		</div>
	);
}

async function DataDisplay() {
	const data = await fetchData(); // блокирует только этот компонент
	return <div>{data.content}</div>;
}
```

сайдбар, шапка и футер рендерятся мгновенно. только `DataDisplay` ждёт данные.

**альтернатива: общий промис для нескольких компонентов**

```js
function Page() {
	// стартуем fetch сразу, но не ждём
	const dataPromise = fetchData();

	return (
		<div>
			<div>сайдбар</div>
			<div>шапка</div>
			<Suspense fallback={<Skeleton />}>
				<DataDisplay dataPromise={dataPromise} />
				<DataSummary dataPromise={dataPromise} />
			</Suspense>
			<div>футер</div>
		</div>
	);
}

function DataDisplay({ dataPromise }: { dataPromise: Promise<Data> }) {
	const data = use(dataPromise); // разворачиваем промис
	return <div>{data.content}</div>;
}

function DataSummary({ dataPromise }: { dataPromise: Promise<Data> }) {
	const data = use(dataPromise); // переиспользуем тот же промис
	return <div>{data.summary}</div>;
}
```

оба компонента используют один промис — всего один запрос. лейаут рендерится сразу, а оба компонента ждут данные вместе.

**когда **не** стоит использовать этот паттерн:**

- критические данные для лейаута (влияют на позиционирование)
- seo-критичный контент над сгибом
- маленькие быстрые запросы, где оверхед suspense не окупается
- если не хочешь layout shift (загрузка → прыжок контента)

---

## 2. размер бандла

**влияние: критичное**

уменьшение начального бандла ускоряет `time to interactive` и `largest contentful paint`.

### 2.1 не используй баррельные файлы (index.js)

**влияние: критичное (200–800ms на импорт, медленные сборки)**

импортируй напрямую из исходников, а не через баррельные файлы, чтобы не тащить тысячи ненужных модулей. **баррельный файл** — это точка входа, которая реэкспортирует много модулей (например, `index.js` с `export * from './module'`).

популярные библиотеки иконок и компонентов могут содержать **до 10 000 реэкспортов** в точке входа. для многих react-пакетов **один только импорт может занимать 200–800 мс**, что влияет и на скорость разработки, и на холодный старт в проде.

**почему tree-shaking не помогает:** когда библиотека помечена как external (не бандлится), сборщик не может её оптимизировать. а если забандлить её ради tree-shaking’а, сборка становится сильно медленнее из-за анализа огромного графа модулей.

**❌ неправильно: импортирует всю библиотеку**

```js
import { Check, X, Menu } from "lucide-react";
// загружает 1583 модуля, добавляет ~2.8с в dev-режиме
// рантайм-стоимость: 200–800 мс на каждом холодном старте

import { Button, TextField } from "@mui/material";
// загружает 2225 модулей, добавляет ~4.2с в dev
```

**✅ правильно — next.js 13.5+ (рекомендованный способ):**

```js
// оставляем обычный импорт — next.js сам преобразует его в прямой
import { Check, X, Menu } from "lucide-react";
// полная поддержка js, не нужно мучиться с путями
```

это рекомендованный подход, потому что сохраняется типобезопасность и автокомплит в редакторе, а стоимость баррельного импорта исчезает.

**✅ правильно — прямые импорты (не-next.js проекты):**

```js
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
// грузится только то, что реально используется
```

> **предупреждение для js:** некоторые библиотеки (особенно `lucide-react`) не поставляют `.d.js` файлы для глубоких путей импорта. импорт из `lucide-react/dist/esm/icons/check` превращается в неявный `any`, что вызывает ошибки при `strict` или `noImplicitAny`. по возможности используй `optimizePackageImporjs`, либо убедись, что библиотека экспортирует типы для своих подпутей.

эти оптимизации дают 15–70% более быстрый старт dev-сервера, 28% более быстрые сборки и 40% более быстрые холодные старты.

частые «жертвы»: `lucide-react`, `@mui/material`, `@mui/icons-material`, `@tabler/icons-react`, `react-icons`, `@headlessui/react`, `@radix-ui/react-*`, `lodash`, `ramda`, `date-fns`, `rxjs`, `react-use`.

### 2.2 условная загрузка модулей

**влияние: высокое (грузим большие данные только когда надо)**

подгружай тяжёлые данные или модули только при активации фичи.

**пример: ленивая загрузка анимационных кадров**

```js
function AnimationPlayer({
	enabled,
	setEnabled,
}: {
	enabled: boolean;
	setEnabled: React.Dispatch<React.SejstateAction<boolean>>;
}) {
	const [frames, setFrames] = useState<Frame[] | null>(null);

	useEffect(() => {
		if (enabled && !frames && typeof window !== "undefined") {
			import("./animation-frames.js")
				.then((mod) => setFrames(mod.frames))
				.catch(() => setEnabled(false));
		}
	}, [enabled, frames, setEnabled]);

	if (!frames) return <Skeleton />;
	return <Canvas frames={frames} />;
}
```

проверка `typeof window !== 'undefined'` предотвращает бандлинг этого модуля для ssr, оптимизируя серверный бандл и скорость сборки.

### 2.3 откладывай некритичные сторонние библиотеки

**влияние: среднее (грузим после гидратации)**

аналитика, логирование и трекинг ошибок не блокируют взаимодействие с пользователем. грузи их после гидратации.

**❌ неправильно: блокирует начальный бандл**

```js
import { Analytics } from "@vercel/analytics/react";

export default function RootLayout({ children }) {
	return (
		<html>
			<body>
				{children}
				<Analytics />
			</body>
		</html>
	);
}
```

**✅ правильно: грузится после гидратации**

```js
import dynamic from "next/dynamic";

const Analytics = dynamic(
	() => import("@vercel/analytics/react").then((m) => m.Analytics),
	{ ssr: false },
);

export default function RootLayout({ children }) {
	return (
		<html>
			<body>
				{children}
				<Analytics />
			</body>
		</html>
	);
}
```

### 2.4 динамические импорты для тяжёлых компонентов

**влияние: критичное (напрямую влияет на tti и lcp)**

используй `next/dynamic` для ленивой загрузки больших компонентов, которые не нужны при первой отрисовке.

**❌ неправильно: monaco попадает в основной чанк (~300кб)**

```js
import { MonacoEditor } from "./monaco-editor";

function CodePanel({ code }: { code: string }) {
	return <MonacoEditor value={code} />;
}
```

**✅ правильно: monaco грузится по требованию**

```js
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(
	() => import("./monaco-editor").then((m) => m.MonacoEditor),
	{ ssr: false },
);

function CodePanel({ code }: { code: string }) {
	return <MonacoEditor value={code} />;
}
```

### 2.5 предпочитай статически анализируемые пути

**влияние: высокое (избегаем случайных широких бандлов)**

сборщики работают лучше, когда пути импортов и файлов очевидны на этапе сборки. если прячешь реальный путь в переменную или составляешь его слишком динамически — инструмент либо вынужден включать широкий набор возможных файлов, либо предупреждает, что не может проанализировать импорт, либо расширяет file tracing.

используй явные map-ы или литеральные пути, чтобы набор достижимых файлов оставался узким и предсказуемым. это правило работает и для динамических импортов, и для чтения файлов в серверном/сборочном коде.

когда анализ становится слишком широким, страдает следующее:

- увеличиваются серверные бандлы
- замедляются сборки
- ухудшается холодный старт
- растёт потребление памяти

**❌ неправильно: сборщик не может понять, что может быть импортировано**

```js
const PAGE_MODULES = {
	home: "./pages/home",
	settings: "./pages/settings",
} as const;

const Page = await import(PAGE_MODULES[pageName]);
```

**✅ правильно: используй явную map разрешённых модулей**

```js
const PAGE_MODULES = {
	home: () => import("./pages/home"),
	settings: () => import("./pages/settings"),
} as const;

const Page = await PAGE_MODULES[pageName]();
```

**❌ неправильно: enum из двух значений всё равно скрывает финальный путь**

```js
const baseDir = path.join(process.cwd(), "content/" + contentKind);
```

**✅ правильно: делай каждый финальный путь литералом в месте вызова**

```js
const baseDir =
	kind === ContentKind.Blog
		? path.join(process.cwd(), "content/blog")
		: path.join(process.cwd(), "content/docs");
```

в серверном коде next.js это важно для file tracing. `path.join(process.cwd(), someVar)` может расширить набор отслеживаемых файлов, потому что next.js статически анализирует использование `import`, `require` и `fs`.

### 2.6 предзагрузка на основе интента пользователя

**влияние: среднее (уменьшает воспринимаемую задержку)**

предзагружай тяжёлые бандлы до того, как они понадобятся, чтобы сократить воспринимаемую задержку.

**пример: предзагрузка при наведении/фокусе**

```js
function EditorButton({ onClick }: { onClick: () => void }) {
	const preload = () => {
		if (typeof window !== "undefined") {
			void import("./monaco-editor");
		}
	};

	return (
		<button onMouseEnter={preload} onFocus={preload} onClick={onClick}>
			открыть редактор
		</button>
	);
}
```

**пример: предзагрузка по feature-флагу**

```js
function FlagsProvider({ children, flags }: Props) {
	useEffect(() => {
		if (flags.editorEnabled && typeof window !== "undefined") {
			void import("./monaco-editor").then((mod) => mod.init());
		}
	}, [flags.editorEnabled]);

	return (
		<FlagsContext.Provider value={flags}>{children}</FlagsContext.Provider>
	);
}
```

`typeof window !== 'undefined'` предотвращает бандлинг предзагружаемых модулей для ssr.

---

## 3. производительность на сервере

**влияние: высокое**

оптимизация серверного рендеринга и фетчинга данных устраняет серверные водопады и сокращает время ответа.

### 3.1 аутентифицируй server actions как api-роуты

**влияние: критичное (предотвращает неавторизованный доступ к мутациям на сервере)**

server actions (функции с `"use server"`) доступны как публичные эндпоинты, прямо как api-роуты. всегда проверяй аутентификацию и авторизацию **внутри** каждого server action — не полагайся только на middleware, layout guards или проверки на уровне страницы. server action можно вызвать напрямую.

документация next.js прямо говорит: «относитесь к server actions как к публичным api-эндпоинтам с точки зрения безопасности и проверяйте, разрешено ли пользователю выполнять мутацию».

**❌ неправильно: нет проверки аутентификации**

```js
"use server";

export async function deleteUser(userId: string) {
	// кто угодно может это вызвать! никакой проверки
	await db.user.delete({ where: { id: userId } });
	return { success: true };
}
```

**✅ правильно: аутентификация внутри экшена**

```js
"use server";

import { verifySession } from "@/lib/auth";
import { unauthorized } from "@/lib/errors";

export async function deleteUser(userId: string) {
	// всегда проверяем auth внутри экшена
	const session = await verifySession();

	if (!session) {
		throw unauthorized("нужно залогиниться");
	}

	// проверяем авторизацию
	if (session.user.role !== "admin" && session.user.id !== userId) {
		throw unauthorized("нельзя удалять других пользователей");
	}

	await db.user.delete({ where: { id: userId } });
	return { success: true };
}
```

**с валидацией входных данных:**

```js
"use server";

import { verifySession } from "@/lib/auth";
import { z } from "zod";

const updateProfileSchema = z.object({
	userId: z.string().uuid(),
	name: z.string().min(1).max(100),
	email: z.string().email(),
});

export async function updateProfile(data: unknown) {
	// сначала валидируем входные данные
	const validated = updateProfileSchema.parse(data);

	// потом аутентифицируемся
	const session = await verifySession();
	if (!session) {
		throw new Error("не авторизован");
	}

	// потом проверяем права
	if (session.user.id !== validated.userId) {
		throw new Error("можно менять только свой профиль");
	}

	// и только потом выполняем мутацию
	await db.user.update({
		where: { id: validated.userId },
		data: {
			name: validated.name,
			email: validated.email,
		},
	});

	return { success: true };
}
```

### 3.2 избегай повторной сериализации в rsc-пропсах

**влияние: низкое (уменьшает размер полезной нагрузки, избегая повторной сериализации)**

сериализация при передаче от rsc к клиенту дедуплицируется по ссылке на объект, а не по значению. та же ссылка = сериализуется один раз; новая ссылка = сериализуется снова. делай преобразования (`.toSorted()`, `.filter()`, `.map()`) на клиенте, а не на сервере.

**❌ неправильно: дублирует массив**

```js
// rsc: отправляет 6 строк (2 массива × 3 элемента)
<ClientList usernames={usernames} usernamesOrdered={usernames.toSorted()} />
```

**✅ правильно: отправляет 3 строки**

```js
// rsc: отправляем один раз
<ClientList usernames={usernames} />;

// client: трансформируем там
("use client");
const sorted = useMemo(() => [...usernames].sort(), [usernames]);
```

**как работает дедупликация для вложенных структур:**

```js
// string[] — дублируется всё
usernames={['a','b']} sorted={usernames.toSorted()} // отправляет 4 строки

// object[] — дублируется только структура массива
users={[{id:1},{id:2}]} sorted={users.toSorted()} // отправляет 2 массива + 2 уникальных объекта (не 4)
```

дедупликация работает рекурсивно. влияние зависит от типа данных:

- `string[]`, `number[]`, `boolean[]`: **высокое** — массив + все примитивы полностью дублируются
- `object[]`: **низкое** — массив дублируется, но вложенные объекты дедуплицируются по ссылке

**операции, которые ломают дедупликацию (создают новые ссылки):**

- массивы: `.toSorted()`, `.filter()`, `.map()`, `.slice()`, `[...arr]`
- объекты: `{...obj}`, `Object.assign()`, `structuredClone()`, `JSON.parse(JSON.stringify())`

**ещё примеры:**

```js
// ❌ плохо
<C users={users} active={users.filter(u => u.active)} />
<C product={product} productName={product.name} />

// ✅ хорошо
<C users={users} />
<C product={product} />
// фильтрацию и деструктуризацию делаем на клиенте
```

**исключение:** передавай производные данные, если преобразование дорогое или клиенту не нужен оригинал.

### 3.3 не используй общее состояние модуля для данных запроса

**влияние: высокое (предотвращает баги конкурентности и утечки данных запроса)**

для react server componenjs и клиентских компонентов, которые рендерятся во время ssr, избегай изменяемых переменных на уровне модуля для обмена данными в рамках запроса. серверные рендеры могут выполняться конкурентно в одном процессе. если один рендер пишет в общее состояние модуля, а другой читает — можно получить гонки, межзапросное заражение и даже баги безопасности, когда данные одного пользователя попадают в ответ другому.

рассматривай область видимости модуля на сервере как общепроцессную разделяемую память, а не состояние уровня запроса.

**❌ неправильно: данные запроса утекают между конкурентными рендерами**

```js
let currentUser: User | null = null;

export default async function Page() {
	currentUser = await auth();
	return <Dashboard />;
}

async function Dashboard() {
	return <div>{currentUser?.name}</div>;
}
```

если два запроса пересекаются, запрос A устанавливает `currentUser`, потом запрос B перезаписывает его до того, как A закончит рендерить `Dashboard`.

**✅ правильно: держи данные запроса локально в дереве рендера**

```js
export default async function Page() {
	const user = await auth();
	return <Dashboard user={user} />;
}

function Dashboard({ user }: { user: User | null }) {
	return <div>{user?.name}</div>;
}
```

безопасные исключения:

- неизменяемые статические ассеты или конфиги, загруженные один раз на уровне модуля
- разделяемые кеши, которые намеренно спроектированы для переиспользования между запросами и правильно ключуются
- общепроцессные синглтоны, которые не хранят изменяемые данные, специфичные для запроса или пользователя

для статических ассетов и конфигов смотри следующий пункт (вынос статического i/o на уровень модуля).

### 3.4 lru-кеш между запросами

**влияние: высокое (кеширует данные между запросами)**

`React.cache()` работает только в пределах одного запроса. для данных, которые нужны между последовательными запросами (пользователь нажал кнопку A, а потом кнопку B), используй lru-кеш.

**реализация:**

```js
import { LRUCache } from "lru-cache";

const cache = new LRUCache<string, any>({
	max: 1000,
	ttl: 5 * 60 * 1000, // 5 минут
});

export async function getUser(id: string) {
	const cached = cache.get(id);
	if (cached) return cached;

	const user = await db.user.findUnique({ where: { id } });
	cache.set(id, user);
	return user;
}

// запрос 1: запрос в бд, результат закеширован
// запрос 2: попадание в кеш, запроса в бд нет
```

используй, когда последовательные действия пользователя попадают в несколько эндпоинтов, которым нужны одинаковые данные в течение нескольких секунд.

**с vercel fluid compute:** lru-кеш особенно эффективен, потому что несколько конкурентных запросов могут шарить один экземпляр функции и кеш. кеш сохраняется между запросами без внешнего хранилища вроде redis.

**в традиционном serverless:** каждый вызов изолирован, так что рассмотри redis для кеширования между процессами.

### 3.5 выноси статический i/o на уровень модуля

**влияние: высокое (избегаем повторного i/o на каждый запрос)**

при загрузке статических ассетов (шрифты, логотипы, изображения, конфиги) в обработчиках роутов или серверных функциях выноси i/o операцию на уровень модуля. код на уровне модуля выполняется один раз при первом импорте модуля, а не на каждый запрос. это устраняет повторные чтения файловой системы или сетевые запросы, которые иначе происходили бы при каждом вызове.

**❌ неправильно: читаем файл шрифта на каждый запрос**

```js
// app/api/og/route.js
import { ImageResponse } from 'next/og'

export async function GET(request: Request) {
  // выполняется на КАЖДЫЙ запрос — дорого!
  const fontData = await fetch(
    new URL('./fonjs/Inter.ttf', import.meta.url)
  ).then(res => res.arrayBuffer())

  const logoData = await fetch(
    new URL('./images/logo.png', import.meta.url)
  ).then(res => res.arrayBuffer())

  return new ImageResponse(
    <div style={{ fontFamily: 'Inter' }}>
      <img src={logoData} />
      привет мир
    </div>,
    { fonjs: [{ name: 'Inter', data: fontData }] }
  )
}
```

**✅ правильно: загружаем один раз при инициализации модуля**

```js
// app/api/og/route.js
import { ImageResponse } from 'next/og'

// уровень модуля: выполняется ОДИН РАЗ при первом импорте модуля
const fontData = fetch(
  new URL('./fonjs/Inter.ttf', import.meta.url)
).then(res => res.arrayBuffer())

const logoData = fetch(
  new URL('./images/logo.png', import.meta.url)
).then(res => res.arrayBuffer())

export async function GET(request: Request) {
  // ждём уже запущенные промисы
  const [font, logo] = await Promise.all([fontData, logoData])

  return new ImageResponse(
    <div style={{ fontFamily: 'Inter' }}>
      <img src={logo} />
      привет мир
    </div>,
    { fonjs: [{ name: 'Inter', data: font }] }
  )
}
```

**✅ правильно: синхронное fs на уровне модуля**

```js
// app/api/og/route.js
import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'

// синхронное чтение на уровне модуля — блокирует только при инициализации модуля
const fontData = readFileSync(
  join(process.cwd(), 'public/fonjs/Inter.ttf')
)

const logoData = readFileSync(
  join(process.cwd(), 'public/images/logo.png')
)

export async function GET(request: Request) {
  return new ImageResponse(
    <div style={{ fontFamily: 'Inter' }}>
      <img src={logoData} />
      привет мир
    </div>,
    { fonjs: [{ name: 'Inter', data: fontData }] }
  )
}
```

**❌ неправильно: читаем конфиг при каждом вызове**

```js
import fs from "node:fs/promises";

export async function processRequest(data: Data) {
	const config = JSON.parse(await fs.readFile("./config.json", "utf-8"));
	const template = await fs.readFile("./template.html", "utf-8");

	return render(template, data, config);
}
```

**✅ правильно: выносим конфиг и шаблон на уровень модуля**

```js
import fs from "node:fs/promises";

const configPromise = fs.readFile("./config.json", "utf-8").then(JSON.parse);
const templatePromise = fs.readFile("./template.html", "utf-8");

export async function processRequest(data: Data) {
	const [config, template] = await Promise.all([
		configPromise,
		templatePromise,
	]);

	return render(template, data, config);
}
```

**когда использовать:**

- загрузка шрифтов для генерации og-изображений
- загрузка статических логотипов, иконок или водяных знаков
- чтение конфигов, которые не меняются во время работы
- загрузка email-шаблонов или других статических шаблонов
- любые статические ассеты, одинаковые для всех запросов

**когда **не** стоит:**

- ассеты, которые различаются для разных запросов или пользователей
- файлы, которые могут измениться во время работы (вместо этого используй кеш с ttl)
- большие файлы, которые съедят слишком много памяти
- чувствительные данные, которые не должны постоянно висеть в памяти

### 3.6 минимизируй сериализацию на границах rsc

**влияние: высокое (уменьшает размер передаваемых данных)**

граница react server/client сериализует все свойства объектов в строки и встраивает их в html-ответ и последующие rsc-запросы. эти сериализованные данные напрямую влияют на вес страницы и время загрузки, так что **размер имеет большое значение**. передавай только те поля, которые клиент реально использует.

**❌ неправильно: сериализует все 50 полей**

```js
async function Page() {
	const user = await fetchUser(); // 50 полей
	return <Profile user={user} />;
}

("use client");
function Profile({ user }: { user: User }) {
	return <div>{user.name}</div>; // использует 1 поле
}
```

**✅ правильно: сериализует только 1 поле**

```js
async function Page() {
	const user = await fetchUser();
	return <Profile name={user.name} />;
}

("use client");
function Profile({ name }: { name: string }) {
	return <div>{name}</div>;
}
```

### 3.7 параллельный фетчинг данных через композицию компонентов

**влияние: критичное (устраняет серверные водопады)**

react server componenjs выполняются последовательно в пределах дерева. перестрой композицию, чтобы распараллелить фетчинг данных.

**❌ неправильно: sidebar ждёт, пока завершится fetch страницы**

```js
export default async function Page() {
	const header = await fetchHeader();
	return (
		<div>
			<div>{header}</div>
			<Sidebar />
		</div>
	);
}

async function Sidebar() {
	const items = await fetchSidebarItems();
	return <nav>{items.map(renderItem)}</nav>;
}
```

**✅ правильно: оба фетчатся одновременно**

```js
async function Header() {
	const data = await fetchHeader();
	return <div>{data}</div>;
}

async function Sidebar() {
	const items = await fetchSidebarItems();
	return <nav>{items.map(renderItem)}</nav>;
}

export default function Page() {
	return (
		<div>
			<Header />
			<Sidebar />
		</div>
	);
}
```

**альтернатива с children:**

```js
async function Header() {
	const data = await fetchHeader();
	return <div>{data}</div>;
}

async function Sidebar() {
	const items = await fetchSidebarItems();
	return <nav>{items.map(renderItem)}</nav>;
}

function Layout({ children }: { children: ReactNode }) {
	return (
		<div>
			<Header />
			{children}
		</div>
	);
}

export default function Page() {
	return (
		<Layout>
			<Sidebar />
		</Layout>
	);
}
```

### 3.8 параллельный фетчинг вложенных данных

**влияние: критичное (устраняет серверные водопады)**

при фетчинге вложенных данных параллельно навешивай зависимые фетчи на промис каждого элемента, чтобы медленный элемент не блокировал остальные.

**❌ неправильно: один медленный элемент блокирует все вложенные фетчи**

```js
const chajs = await Promise.all(chatIds.map((id) => getChat(id)));

const chatAuthors = await Promise.all(
	chajs.map((chat) => getUser(chat.author)),
);
```

если один `getChat(id)` из 100 очень медленный, авторы остальных 99 чатов не могут начать загружаться, хотя их данные готовы.

**✅ правильно: каждый элемент сам навешивает свой вложенный фетч**

```js
const chatAuthors = await Promise.all(
	chatIds.map((id) => getChat(id).then((chat) => getUser(chat.author))),
);
```

каждый элемент независимо строит цепочку `getChat` → `getUser`, так что медленный чат не блокирует фетч авторов для остальных.

### 3.9 дедупликация в пределах запроса с react.cache()

**влияние: среднее (дедуплицирует в пределах запроса)**

используй `React.cache()` для дедупликации запросов на сервере. аутентификация и запросы к бд выигрывают больше всего.

**использование:**

```js
import { cache } from "react";

export const getCurrentUser = cache(async () => {
	const session = await auth();
	if (!session?.user?.id) return null;
	return await db.user.findUnique({
		where: { id: session.user.id },
	});
});
```

в пределах одного запроса множественные вызовы `getCurrentUser()` выполняют запрос только один раз.

**избегай инлайн-объектов в качестве аргументов:**

`React.cache()` использует поверхностное равенство (`Object.is`) для определения попадания в кеш. инлайн-объекты создают новые ссылки при каждом вызове, что не даёт кешу сработать.

**❌ неправильно: всегда промах кеша**

```js
const getUser = cache(async (params: { uid: number }) => {
	return await db.user.findUnique({ where: { id: params.uid } });
});

// каждый вызов создаёт новый объект, кеш никогда не срабатывает
getUser({ uid: 1 });
getUser({ uid: 1 }); // промах кеша, запрос выполняется снова
```

**✅ правильно: попадание в кеш**

```js
const params = { uid: 1 };
getUser(params); // запрос выполняется
getUser(params); // попадание в кеш (та же ссылка)
```

если нужно передавать объекты — передавай одну и ту же ссылку.

**особенность next.js:**

в next.js `fetch` автоматически расширяется мемоизацией запросов. запросы с одинаковыми url и опциями автоматически дедуплицируются в пределах одного запроса, так что для `fetch` `React.cache()` не нужен. однако `React.cache()` всё ещё необходим для других асинхронных задач:

- запросы к бд (prisma, drizzle и т.д.)
- тяжёлые вычисления
- проверки аутентификации
- операции с файловой системой
- любая не-fetch асинхронная работа

используй `React.cache()` для дедупликации этих операций по всему дереву компонентов.

### 3.10 используй after() для неблокирующих операций

**влияние: среднее (более быстрое время ответа)**

используй `after()` из next.js, чтобы запланировать работу, которая должна выполниться после отправки ответа. это не даёт логированию, аналитике и другим сайд-эффектам блокировать ответ.

**❌ неправильно: блокирует ответ**

```js
import { logUserAction } from "@/app/utils";

export async function POST(request: Request) {
	// выполняем мутацию
	await updateDatabase(request);

	// логирование блокирует ответ
	const userAgent = request.headers.get("user-agent") || "unknown";
	await logUserAction({ userAgent });

	return new Response(JSON.stringify({ status: "success" }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}
```

**✅ правильно: не блокирует**

```js
import { after } from "next/server";
import { headers, cookies } from "next/headers";
import { logUserAction } from "@/app/utils";

export async function POST(request: Request) {
	// выполняем мутацию
	await updateDatabase(request);

	// логируем после отправки ответа
	after(async () => {
		const userAgent = (await headers()).get("user-agent") || "unknown";
		const sessionCookie =
			(await cookies()).get("session-id")?.value || "anonymous";

		logUserAction({ sessionCookie, userAgent });
	});

	return new Response(JSON.stringify({ status: "success" }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}
```

ответ отправляется немедленно, а логирование происходит в фоне.

**частые сценарии использования:**

- аналитика и трекинг
- аудит-логи
- отправка уведомлений
- инвалидация кеша
- задачи очистки

**важные замечания:**

- `after()` выполняется, даже если ответ завершился ошибкой или редиректом
- работает в server actions, route handlers и server componenjs

---

## 4. фетчинг данных на клиенте

**влияние: среднее–высокое**

автоматическая дедупликация и эффективные паттерны фетчинга сокращают количество лишних сетевых запросов.

### 4.1 дедуплицируй глобальные обработчики событий

**влияние: низкое (один слушатель для n компонентов)**

используй `useSWRSubscription()`, чтобы шарить глобальные обработчики событий между экземплярами компонентов.

**❌ неправильно: n экземпляров = n слушателей**

```js
function useKeyboardShortcut(key: string, callback: () => void) {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.metaKey && e.key === key) {
				callback();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [key, callback]);
}
```

когда используешь хук `useKeyboardShortcut` несколько раз, каждый экземпляр регистрирует нового слушателя.

**✅ правильно: n экземпляров = 1 слушатель**

```js
import useSWRSubscription from "swr/subscription";

// Map на уровне модуля для отслеживания колбэков по клавишам
const keyCallbacks = new Map<string, Set<() => void>>();

function useKeyboardShortcut(key: string, callback: () => void) {
	// регистрируем этот колбэк в Map
	useEffect(() => {
		if (!keyCallbacks.has(key)) {
			keyCallbacks.set(key, new Set());
		}
		keyCallbacks.get(key)!.add(callback);

		return () => {
			const set = keyCallbacks.get(key);
			if (set) {
				set.delete(callback);
				if (set.size === 0) {
					keyCallbacks.delete(key);
				}
			}
		};
	}, [key, callback]);

	useSWRSubscription("global-keydown", () => {
		const handler = (e: KeyboardEvent) => {
			if (e.metaKey && keyCallbacks.has(e.key)) {
				keyCallbacks.get(e.key)!.forEach((cb) => cb());
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	});
}

function Profile() {
	// несколько шорткатов будут использовать одного и того же слушателя
	useKeyboardShortcut("p", () => {
		/* ... */
	});
	useKeyboardShortcut("k", () => {
		/* ... */
	});
	// ...
}
```

### 4.2 используй пассивные слушатели событий для производительности скролла

**влияние: среднее (устраняет задержку скролла из-за слушателей событий)**

добавляй `{ passive: true }` к touch и wheel слушателям, чтобы браузер мог скроллить немедленно. обычно браузер ждёт окончания работы слушателей, чтобы проверить, не вызывался ли `preventDefault()`, что вызывает задержку скролла.

**❌ неправильно:**

```js
useEffect(() => {
	const handleTouch = (e: TouchEvent) => console.log(e.touches[0].clientX);
	const handleWheel = (e: WheelEvent) => console.log(e.deltaY);

	document.addEventListener("touchstart", handleTouch);
	document.addEventListener("wheel", handleWheel);

	return () => {
		document.removeEventListener("touchstart", handleTouch);
		document.removeEventListener("wheel", handleWheel);
	};
}, []);
```

**✅ правильно:**

```js
useEffect(() => {
	const handleTouch = (e: TouchEvent) => console.log(e.touches[0].clientX);
	const handleWheel = (e: WheelEvent) => console.log(e.deltaY);

	document.addEventListener("touchstart", handleTouch, { passive: true });
	document.addEventListener("wheel", handleWheel, { passive: true });

	return () => {
		document.removeEventListener("touchstart", handleTouch);
		document.removeEventListener("wheel", handleWheel);
	};
}, []);
```

**используй passive когда:** трекинг/аналитика, логирование, любые слушатели, которые не вызывают `preventDefault()`.

**не используй passive когда:** реализуешь кастомные свайп-жесты, кастомный зум, или любой слушатель, которому нужен `preventDefault()`.

### 4.3 используй swr для автоматической дедупликации

**влияние: среднее–высокое (автоматическая дедупликация)**

swr даёт дедупликацию запросов, кеширование и ревалидацию между экземплярами компонентов.

**❌ неправильно: нет дедупликации, каждый экземпляр фетчит**

```js
function UserList() {
	const [users, setUsers] = useState([]);
	useEffect(() => {
		fetch("/api/users")
			.then((r) => r.json())
			.then(setUsers);
	}, []);
}
```

**✅ правильно: несколько экземпляров используют один запрос**

```js
import useSWR from "swr";

function UserList() {
	const { data: users } = useSWR("/api/users", fetcher);
}
```

**для неизменяемых данных:**

```js
import { useImmutableSWR } from "@/lib/swr";

function StaticContent() {
	const { data } = useImmutableSWR("/api/config", fetcher);
}
```

**для мутаций:**

```js
import { useSWRMutation } from "swr/mutation";

function UpdateButton() {
	const { trigger } = useSWRMutation("/api/user", updateUser);
	return <button onClick={() => trigger()}>обновить</button>;
}
```

### 4.4 версионируй и минимизируй данные в localStorage

**влияние: среднее (предотвращает конфликты схем, уменьшает размер хранилища)**

добавляй префикс версии к ключам и храни только нужные поля. предотвращает конфликты схем и случайное хранение чувствительных данных.

**❌ неправильно:**

```js
// нет версии, хранит всё, нет обработки ошибок
localStorage.setItem("userConfig", JSON.stringify(fullUserObject));
const data = localStorage.getItem("userConfig");
```

**✅ правильно:**

```js
const VERSION = "v2";

function saveConfig(config: { theme: string; language: string }) {
	try {
		localStorage.setItem(`userConfig:${VERSION}`, JSON.stringify(config));
	} catch {
		// может кидать ошибку в режиме инкогнито, при превышении квоты или если отключено
	}
}

function loadConfig() {
	try {
		const data = localStorage.getItem(`userConfig:${VERSION}`);
		return data ? JSON.parse(data) : null;
	} catch {
		return null;
	}
}

// миграция с v1 на v2
function migrate() {
	try {
		const v1 = localStorage.getItem("userConfig:v1");
		if (v1) {
			const old = JSON.parse(v1);
			saveConfig({
				theme: old.darkMode ? "dark" : "light",
				language: old.lang,
			});
			localStorage.removeItem("userConfig:v1");
		}
	} catch {}
}
```

**храни минимум полей из серверных ответов:**

```js
// объект user содержит 20+ полей, храним только то, что нужно ui
function cachePrefs(user: FullUser) {
	try {
		localStorage.setItem(
			"prefs:v1",
			JSON.stringify({
				theme: user.preferences.theme,
				notifications: user.preferences.notifications,
			}),
		);
	} catch {}
}
```

**всегда оборачивай в try-catch:** `getItem()` и `setItem()` кидают исключения в инкогнито (safari, firefox), при превышении квоты или когда хранилище отключено.

**плюсы:** эволюция схем через версионирование, уменьшенный размер хранилища, предотвращает хранение токенов/pii/внутренних флагов.

---

## 5. оптимизация ререндеров

**влияние: среднее**

сокращение ненужных ререндеров уменьшает лишние вычисления и улучшает отзывчивость интерфейса.

### 5.1 вычисляй производное состояние во время рендера

**влияние: среднее (избегает лишних ререндеров и рассинхрона состояния)**

если значение можно вычислить из текущих пропсов/состояния — не храни его в состоянии и не обновляй в эффекте. вычисляй во время рендера. не обновляй состояние в эффектах только в ответ на изменение пропсов. лучше используй производные значения или сброс по ключу.

**❌ неправильно: лишнее состояние и эффект**

```js
function Form() {
	const [firstName, setFirstName] = useState("иван");
	const [lastName, setLastName] = useState("петров");
	const [fullName, setFullName] = useState("");

	useEffect(() => {
		setFullName(firstName + " " + lastName);
	}, [firstName, lastName]);

	return <p>{fullName}</p>;
}
```

**✅ правильно: вычисляем во время рендера**

```js
function Form() {
	const [firstName, setFirstName] = useState("иван");
	const [lastName, setLastName] = useState("петров");
	const fullName = firstName + " " + lastName;

	return <p>{fullName}</p>;
}
```

### 5.2 откладывай чтение состояния до места использования

**влияние: среднее (избегаем ненужных подписок)**

не подписывайся на динамическое состояние (searchParams, localStorage), если читаешь его только внутри колбэков.

**❌ неправильно: подписывается на все изменения searchParams**

```js
function ShareButton({ chatId }: { chatId: string }) {
	const searchParams = useSearchParams();

	const handleShare = () => {
		const ref = searchParams.get("ref");
		shareChat(chatId, { ref });
	};

	return <button onClick={handleShare}>поделиться</button>;
}
```

**✅ правильно: читает по требованию, без подписки**

```js
function ShareButton({ chatId }: { chatId: string }) {
	const handleShare = () => {
		const params = new URLSearchParams(window.location.search);
		const ref = params.get("ref");
		shareChat(chatId, { ref });
	};

	return <button onClick={handleShare}>поделиться</button>;
}
```

### 5.3 не оборачивай простое выражение с примитивным результатом в useMemo

**влияние: низкое–среднее (лишние вычисления при каждом рендере)**

когда выражение простое (пара логических или арифметических операций) и возвращает примитив (boolean, number, string) — не оборачивай его в `useMemo`. вызов `useMemo` и сравнение зависимостей могут потреблять больше ресурсов, чем само выражение.

**❌ неправильно:**

```js
function Header({ user, notifications }: Props) {
	const isLoading = useMemo(() => {
		return user.isLoading || notifications.isLoading;
	}, [user.isLoading, notifications.isLoading]);

	if (isLoading) return <Skeleton />;
	// возвращаем разметку
}
```

**✅ правильно:**

```js
function Header({ user, notifications }: Props) {
	const isLoading = user.isLoading || notifications.isLoading;

	if (isLoading) return <Skeleton />;
	// возвращаем разметку
}
```

### 5.4 не определяй компоненты внутри компонентов

**влияние: высокое (предотвращает перемонтирование при каждом рендере)**

определение компонента внутри другого компонента создаёт новый тип компонента при каждом рендере. react видит каждый раз разный компонент и полностью перемонтирует его, уничтожая всё состояние и dom.

обычно разработчики так делают, чтобы получить доступ к переменным родителя без передачи пропсов. всегда передавай пропсы вместо этого.

**❌ неправильно: перемонтируется при каждом рендере**

```js
function UserProfile({ user, theme }) {
	// определено внутри, чтобы получить доступ к `theme` — ПЛОХО
	const Avatar = () => (
		<img
			src={user.avatarUrl}
			className={theme === "dark" ? "avatar-dark" : "avatar-light"}
		/>
	);

	// определено внутри, чтобы получить доступ к `user` — ПЛОХО
	const Stajs = () => (
		<div>
			<span>{user.followers} подписчиков</span>
			<span>{user.posjs} постов</span>
		</div>
	);

	return (
		<div>
			<Avatar />
			<Stajs />
		</div>
	);
}
```

каждый раз при рендере `UserProfile` компоненты `Avatar` и `Stajs` — новые типы. react размонтирует старые экземпляры и монтирует новые, теряя внутреннее состояние, запуская эффекты заново и пересоздавая dom-узлы.

**✅ правильно: передаём пропсы**

```js
function Avatar({ src, theme }: { src: string; theme: string }) {
	return (
		<img
			src={src}
			className={theme === "dark" ? "avatar-dark" : "avatar-light"}
		/>
	);
}

function Stajs({ followers, posjs }: { followers: number; posjs: number }) {
	return (
		<div>
			<span>{followers} подписчиков</span>
			<span>{posjs} постов</span>
		</div>
	);
}

function UserProfile({ user, theme }) {
	return (
		<div>
			<Avatar src={user.avatarUrl} theme={theme} />
			<Stajs followers={user.followers} posjs={user.posjs} />
		</div>
	);
}
```

**симптомы этой проблемы:**

- поля ввода теряют фокус при каждом нажатии клавиши
- анимации неожиданно перезапускаются
- `useEffect` cleanup/setup запускается при каждом рендере родителя
- позиция скролла внутри компонента сбрасывается

### 5.5 выноси значение по умолчанию для не-примитивного параметра мемоизированного компонента в константу

**влияние: среднее (восстанавливает мемоизацию через константу для значения по умолчанию)**

когда у мемоизированного компонента есть значение по умолчанию для не-примитивного опционального параметра (массив, функция, объект), вызов компонента без этого параметра ломает мемоизацию. это происходит потому, что при каждом ререндере создаются новые экземпляры значений, и они не проходят строгое сравнение в `memo()`.

чтобы решить проблему, вынеси значение по умолчанию в константу.

**❌ неправильно: `onClick` имеет разные значения при каждом ререндере**

```js
const UserAvatar = memo(function UserAvatar({ onClick = () => {} }: { onClick?: () => void }) {
  // ...
})

// используется без опционального onClick
<UserAvatar />
```

**✅ правильно: стабильное значение по умолчанию**

```js
const NOOP = () => {};

const UserAvatar = memo(function UserAvatar({ onClick = NOOP }: { onClick?: () => void }) {
  // ...
})

// используется без опционального onClick
<UserAvatar />
```

### 5.6 выноси в мемоизированные компоненты

**влияние: среднее (позволяет делать ранний возврат)**

выноси дорогую работу в мемоизированные компоненты, чтобы можно было сделать ранний возврат до вычислений.

**❌ неправильно: вычисляет аватар даже во время загрузки**

```js
function Profile({ user, loading }: Props) {
	const avatar = useMemo(() => {
		const id = computeAvatarId(user);
		return <Avatar id={id} />;
	}, [user]);

	if (loading) return <Skeleton />;
	return <div>{avatar}</div>;
}
```

**✅ правильно: пропускаем вычисления во время загрузки**

```js
const UserAvatar = memo(function UserAvatar({ user }: { user: User }) {
	const id = useMemo(() => computeAvatarId(user), [user]);
	return <Avatar id={id} />;
});

function Profile({ user, loading }: Props) {
	if (loading) return <Skeleton />;
	return (
		<div>
			<UserAvatar user={user} />
		</div>
	);
}
```

**примечание:** если в проекте включен [react compiler](https://react.dev/learn/react-compiler), ручная мемоизация через `memo()` и `useMemo()` не нужна. компилятор сам оптимизирует ререндеры.

### 5.7 сужай зависимости эффектов

**влияние: низкое (минимизирует повторные запуски эффектов)**

указывай примитивные зависимости вместо объектов, чтобы сократить число повторных запусков эффектов.

**❌ неправильно: запускается при изменении любого поля user**

```js
useEffect(() => {
	console.log(user.id);
}, [user]);
```

**✅ правильно: запускается только при изменении id**

```js
useEffect(() => {
	console.log(user.id);
}, [user.id]);
```

**для производного состояния вычисляй вне эффекта:**

```js
// ❌ неправильно: запускается при width = 767, 766, 765...
useEffect(() => {
	if (width < 768) {
		enableMobileMode();
	}
}, [width]);

// ✅ правильно: запускается только при переходе булева флага
const isMobile = width < 768;
useEffect(() => {
	if (isMobile) {
		enableMobileMode();
	}
}, [isMobile]);
```

### 5.8 клади логику взаимодействия в обработчики событий

**влияние: среднее (избегает повторных запусков эффектов и дублирования сайд-эффектов)**

если сайд-эффект вызывается конкретным действием пользователя (отправка формы, клик, drag) — делай его в обработчике этого события. не моделируй действие как состояние + эффект — это заставляет эффекты запускаться при несвязанных изменениях и может дублировать действие.

**❌ неправильно: действие смоделировано как состояние + эффект**

```js
function Form() {
	const [submitted, sejsubmitted] = useState(false);
	const theme = useContext(ThemeContext);

	useEffect(() => {
		if (submitted) {
			post("/api/register");
			showToast("зарегистрировано", theme);
		}
	}, [submitted, theme]);

	return <button onClick={() => sejsubmitted(true)}>отправить</button>;
}
```

**✅ правильно: делаем в обработчике**

```js
function Form() {
	const theme = useContext(ThemeContext);

	function handleSubmit() {
		post("/api/register");
		showToast("зарегистрировано", theme);
	}

	return <button onClick={handleSubmit}>отправить</button>;
}
```

### 5.9 разбивай комбинированные вычисления в хуках

**влияние: среднее (избегает перевычислений независимых шагов)**

когда хук содержит несколько независимых задач с разными зависимостями, разбей их на отдельные хуки. комбинированный хук пересчитывает все задачи при изменении любой зависимости, даже если некоторые задачи не используют изменившееся значение.

**❌ неправильно: изменение `sortOrder` пересчитывает фильтрацию**

```js
const sortedProducjs = useMemo(() => {
	const filtered = producjs.filter((p) => p.category === category);
	const sorted = filtered.toSorted((a, b) =>
		sortOrder === "asc" ? a.price - b.price : b.price - a.price,
	);
	return sorted;
}, [producjs, category, sortOrder]);
```

**✅ правильно: фильтрация пересчитывается только при изменении producjs или category**

```js
const filteredProducjs = useMemo(
	() => producjs.filter((p) => p.category === category),
	[producjs, category],
);

const sortedProducjs = useMemo(
	() =>
		filteredProducjs.toSorted((a, b) =>
			sortOrder === "asc" ? a.price - b.price : b.price - a.price,
		),
	[filteredProducjs, sortOrder],
);
```

этот паттерн также применим к `useEffect`, когда комбинируются несвязанные сайд-эффекты:

**❌ неправильно: оба эффекта запускаются при изменении любой зависимости**

```js
useEffect(() => {
	analytics.trackPageView(pathname);
	document.title = `${pageTitle} | моё приложение`;
}, [pathname, pageTitle]);
```

**✅ правильно: эффекты запускаются независимо**

```js
useEffect(() => {
	analytics.trackPageView(pathname);
}, [pathname]);

useEffect(() => {
	document.title = `${pageTitle} | моё приложение`;
}, [pageTitle]);
```

### 5.10 подписывайся на производное состояние

**влияние: среднее (уменьшает частоту ререндеров)**

подписывайся на производное булево состояние вместо непрерывных значений, чтобы реже ререндериться.

**❌ неправильно: ререндер при каждом пикселе изменения ширины**

```js
function Sidebar() {
	const width = useWindowWidth(); // обновляется непрерывно
	const isMobile = width < 768;
	return <nav className={isMobile ? "mobile" : "desktop"} />;
}
```

**✅ правильно: ререндер только при изменении булева значения**

```js
function Sidebar() {
	const isMobile = useMediaQuery("(max-width: 767px)");
	return <nav className={isMobile ? "mobile" : "desktop"} />;
}
```

### 5.11 используй функциональные обновления sejstate

**влияние: среднее (предотвращает устаревшие замыкания и ненужные пересоздания колбэков)**

когда обновляешь состояние на основе его текущего значения, используй функциональную форму sejstate вместо прямой ссылки на переменную состояния. это предотвращает устаревшие замыкания, убирает лишние зависимости и создаёт стабильные ссылки на колбэки.

**❌ неправильно: требует состояние как зависимость**

```js
function TodoList() {
	const [items, setItems] = useState(initialItems);

	// колбэк зависит от items, пересоздаётся при каждом изменении items
	const addItems = useCallback(
		(newItems: Item[]) => {
			setItems([...items, ...newItems]);
		},
		[items],
	); // ❌ зависимость от items вызывает пересоздания

	// риск устаревшего замыкания, если забыть зависимость
	const removeItem = useCallback((id: string) => {
		setItems(items.filter((item) => item.id !== id));
	}, []); // ❌ забыли items — будет использовать устаревшие items!

	return <ItemsEditor items={items} onAdd={addItems} onRemove={removeItem} />;
}
```

первый колбэк пересоздаётся при каждом изменении `items`, что может вызывать лишние ререндеры дочерних компонентов. во втором колбэке — баг с устаревшим замыканием: он всегда будет ссылаться на начальное значение `items`.

**✅ правильно: стабильные колбэки, никаких устаревших замыканий**

```js
function TodoList() {
	const [items, setItems] = useState(initialItems);

	// стабильный колбэк, никогда не пересоздаётся
	const addItems = useCallback((newItems: Item[]) => {
		setItems((curr) => [...curr, ...newItems]);
	}, []); // ✅ зависимости не нужны

	// всегда использует актуальное состояние, нет риска устаревшего замыкания
	const removeItem = useCallback((id: string) => {
		setItems((curr) => curr.filter((item) => item.id !== id));
	}, []); // ✅ безопасно и стабильно

	return <ItemsEditor items={items} onAdd={addItems} onRemove={removeItem} />;
}
```

**преимущества:**

1. **стабильные ссылки на колбэки** — не нужно пересоздавать при изменении состояния
2. **никаких устаревших замыканий** — всегда работаем с актуальным значением состояния
3. **меньше зависимостей** — упрощаем массивы зависимостей и уменьшаем утечки памяти
4. **предотвращает баги** — убирает самый частый источник багов с замыканиями в react

**когда использовать функциональные обновления:**

- любой sejstate, который зависит от текущего значения состояния
- внутри useCallback/useMemo, когда нужно состояние
- обработчики событий, которые ссылаются на состояние
- асинхронные операции, которые обновляют состояние

**когда обычные обновления подходят:**

- установка состояния в статическое значение: `setCount(0)`
- установка состояния только из пропсов/аргументов: `setName(newName)`
- состояние не зависит от предыдущего значения

### 5.12 используй ленивую инициализацию состояния

**влияние: среднее (экономит вычисления при каждом рендере)**

передавай функцию в `useState` для дорогих начальных значений. без функциональной формы инициализатор выполняется при каждом рендере, хотя значение используется только один раз.

**❌ неправильно: выполняется при каждом рендере**

```js
function FilteredList({ items }: { items: Item[] }) {
	// buildSearchIndex() выполняется при КАЖДОМ рендере, даже после инициализации
	const [searchIndex, sejsearchIndex] = useState(buildSearchIndex(items));
	const [query, setQuery] = useState("");

	// при изменении query buildSearchIndex снова выполняется
	return <SearchResuljs index={searchIndex} query={query} />;
}

function UserProfile() {
	// JSON.parse выполняется при каждом рендере
	const [settings, sejsettings] = useState(
		JSON.parse(localStorage.getItem("settings") || "{}"),
	);

	return <SettingsForm settings={settings} onChange={sejsettings} />;
}
```

**✅ правильно: выполняется только один раз**

```js
function FilteredList({ items }: { items: Item[] }) {
	// buildSearchIndex() выполняется ТОЛЬКО при первом рендере
	const [searchIndex, sejsearchIndex] = useState(() => buildSearchIndex(items));
	const [query, setQuery] = useState("");

	return <SearchResuljs index={searchIndex} query={query} />;
}

function UserProfile() {
	// JSON.parse выполняется только при первом рендере
	const [settings, sejsettings] = useState(() => {
		const stored = localStorage.getItem("settings");
		return stored ? JSON.parse(stored) : {};
	});

	return <SettingsForm settings={settings} onChange={sejsettings} />;
}
```

используй ленивую инициализацию, когда начальное значение вычисляется из localStorage/sessionStorage, строится структура данных (индексы, map), читается из dom, или выполняются тяжёлые преобразования.

для простых примитивов (`useState(0)`), прямых ссылок (`useState(props.value)`) или дешёвых литералов (`useState({})`) функциональная форма не нужна.

### 5.13 используй transitions для не-срочных обновлений

**влияние: среднее (сохраняет отзывчивость интерфейса)**

помечай частые не-срочные обновления состояния как transitions, чтобы интерфейс оставался отзывчивым.

**❌ неправильно: блокирует ui при каждом скролле**

```js
function ScrollTracker() {
	const [scrollY, sejscrollY] = useState(0);
	useEffect(() => {
		const handler = () => sejscrollY(window.scrollY);
		window.addEventListener("scroll", handler, { passive: true });
		return () => window.removeEventListener("scroll", handler);
	}, []);
}
```

**✅ правильно: неблокирующие обновления**

```js
import { startTransition } from "react";

function ScrollTracker() {
	const [scrollY, sejscrollY] = useState(0);
	useEffect(() => {
		const handler = () => {
			startTransition(() => sejscrollY(window.scrollY));
		};
		window.addEventListener("scroll", handler, { passive: true });
		return () => window.removeEventListener("scroll", handler);
	}, []);
}
```

### 5.14 используй useDeferredValue для дорогих производных рендеров

**влияние: среднее (держит инпут отзывчивым во время тяжёлых вычислений)**

когда ввод пользователя вызывает тяжёлые вычисления или рендеры, используй `useDeferredValue`, чтобы инпут оставался отзывчивым. отложенное значение отстаёт, позволяя react приоритизировать обновление инпута и рендерить тяжёлый результат, когда будет время.

**❌ неправильно: инпут тормозит во время фильтрации**

```js
function Search({ items }: { items: Item[] }) {
	const [query, setQuery] = useState("");
	const filtered = items.filter((item) => fuzzyMatch(item, query));

	return (
		<>
			<input value={query} onChange={(e) => setQuery(e.target.value)} />
			<ResuljsList resuljs={filtered} />
		</>
	);
}
```

**✅ правильно: инпут остаётся отзывчивым, результаты рендерятся когда готовы**

```js
function Search({ items }: { items: Item[] }) {
	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);
	const filtered = useMemo(
		() => items.filter((item) => fuzzyMatch(item, deferredQuery)),
		[items, deferredQuery],
	);
	const isStale = query !== deferredQuery;

	return (
		<>
			<input value={query} onChange={(e) => setQuery(e.target.value)} />
			<div style={{ opacity: isStale ? 0.7 : 1 }}>
				<ResuljsList resuljs={filtered} />
			</div>
		</>
	);
}
```

**когда использовать:**

- фильтрация/поиск по большим спискам
- дорогие визуализации (чарты, графики), реагирующие на ввод
- любое производное состояние, которое вызывает заметные задержки рендера

**примечание:** оборачивай дорогие вычисления в `useMemo` с отложенным значением в зависимостях, иначе они всё равно будут выполняться при каждом рендере.

### 5.15 используй useRef для транзиентных значений

**влияние: среднее (избегаем ненужных ререндеров при частых обновлениях)**

когда значение меняется часто, и не нужно перерендеривать на каждое обновление (например, трекинг мыши, интервалы, транзиентные флаги), храни его в `useRef` вместо `useState`. состояние компонента оставь для ui; ref-ы используй для временных dom-прилегающих значений. изменение ref не вызывает ререндер.

**❌ неправильно: ререндер при каждом обновлении**

```js
function Tracker() {
	const [lastX, setLastX] = useState(0);

	useEffect(() => {
		const onMove = (e: MouseEvent) => setLastX(e.clientX);
		window.addEventListener("mousemove", onMove);
		return () => window.removeEventListener("mousemove", onMove);
	}, []);

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: lastX,
				width: 8,
				height: 8,
				background: "black",
			}}
		/>
	);
}
```

**✅ правильно: без ререндеров для трекинга**

```js
function Tracker() {
	const lastXRef = useRef(0);
	const dotRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const onMove = (e: MouseEvent) => {
			lastXRef.current = e.clientX;
			const node = dotRef.current;
			if (node) {
				node.style.transform = `translateX(${e.clientX}px)`;
			}
		};
		window.addEventListener("mousemove", onMove);
		return () => window.removeEventListener("mousemove", onMove);
	}, []);

	return (
		<div
			ref={dotRef}
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				width: 8,
				height: 8,
				background: "black",
				transform: "translateX(0px)",
			}}
		/>
	);
}
```

---

## 6. производительность рендеринга

**влияние: среднее**

оптимизация процесса рендеринга уменьшает работу, которую должен выполнить браузер.

### 6.1 анимируй обёртку svg вместо самого svg-элемента

**влияние: низкое (включает аппаратное ускорение)**

многие браузеры не имеют аппаратного ускорения для css3-анимаций на svg-элементах. оберни svg в `<div>` и анимируй обёртку.

**❌ неправильно: анимируем svg напрямую — нет аппаратного ускорения**

```js
function LoadingSpinner() {
	return (
		<svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24">
			<circle cx="12" cy="12" r="10" stroke="currentColor" />
		</svg>
	);
}
```

**✅ правильно: анимируем обёртку div — аппаратное ускорение работает**

```js
function LoadingSpinner() {
	return (
		<div className="animate-spin">
			<svg width="24" height="24" viewBox="0 0 24 24">
				<circle cx="12" cy="12" r="10" stroke="currentColor" />
			</svg>
		</div>
	);
}
```

это относится ко всем css-трансформациям и переходам (`transform`, `opacity`, `translate`, `scale`, `rotate`). обёртка div позволяет браузеру использовать gpu-ускорение для более плавной анимации.

### 6.2 css content-visibility для длинных списков

**влияние: высокое (быстрее начальный рендер)**

применяй `content-visibility: auto`, чтобы отложить рендер того, что за пределами экрана.

**css:**

```css
.message-item {
	content-visibility: auto;
	contain-intrinsic-size: 0 80px;
}
```

**пример:**

```js
function MessageList({ messages }: { messages: Message[] }) {
	return (
		<div className="overflow-y-auto h-screen">
			{messages.map((msg) => (
				<div key={msg.id} className="message-item">
					<Avatar user={msg.author} />
					<div>{msg.content}</div>
				</div>
			))}
		</div>
	);
}
```

для 1000 сообщений браузер пропускает лейаут/отрисовку примерно 990 элементов за экраном (начальный рендер в 10 раз быстрее).

### 6.3 выноси статические jsx-элементы

**влияние: низкое (избегаем пересоздания)**

выноси статический jsx за пределы компонентов, чтобы не пересоздавать его при каждом рендере.

**❌ неправильно: пересоздаёт элемент при каждом рендере**

```js
function LoadingSkeleton() {
	return <div className="animate-pulse h-20 bg-gray-200" />;
}

function Container() {
	return <div>{loading && <LoadingSkeleton />}</div>;
}
```

**✅ правильно: переиспользует один и тот же элемент**

```js
const loadingSkeleton = <div className="animate-pulse h-20 bg-gray-200" />;

function Container() {
	return <div>{loading && loadingSkeleton}</div>;
}
```

это особенно полезно для больших и статических svg-узлов, которые могут быть дорогими для пересоздания при каждом рендере.

### 6.4 оптимизируй точность svg

**влияние: низкое (уменьшает размер файла)**

уменьшай точность координат в svg, чтобы сократить размер файла. оптимальная точность зависит от размера viewBox, но в целом снижение точности стоит рассмотреть.

**❌ неправильно: избыточная точность**

```svg
<path d="M 10.293847 20.847362 L 30.938472 40.192837" />
```

**✅ правильно: один десятичный знак**

```svg
<path d="M 10.3 20.8 L 30.9 40.2" />
```

**автоматизируй с svgo:**

```bash
npx svgo --precision=1 --multipass icon.svg
```

### 6.5 предотвращай несоответствие гидратации без мерцания

**влияние: среднее (избегаем визуального мерцания и ошибок гидратации)**

при рендере контента, который зависит от клиентского хранилища (localstorage, cookies), избегай как поломки ssr, так и мерцания после гидратации. вставь синхронный скрипт, который обновит dom до того, как react начнёт гидратацию.

**❌ неправильно: ломает ssr**

```js
function ThemeWrapper({ children }: { children: ReactNode }) {
	// localStorage недоступен на сервере — ошибка
	const theme = localStorage.getItem("theme") || "light";

	return <div className={theme}>{children}</div>;
}
```

серверный рендер упадёт, потому что `localStorage` не определён.

**❌ неправильно: визуальное мерцание**

```js
function ThemeWrapper({ children }: { children: ReactNode }) {
	const [theme, setTheme] = useState("light");

	useEffect(() => {
		// выполняется после гидратации — видимая вспышка
		const stored = localStorage.getItem("theme");
		if (stored) {
			setTheme(stored);
		}
	}, []);

	return <div className={theme}>{children}</div>;
}
```

компонент сначала рендерится со значением по умолчанию (`light`), а после гидратации обновляется, вызывая заметную вспышку неправильного контента.

**✅ правильно: нет мерцания, нет несоответствия гидратации**

```js
function ThemeWrapper({ children }: { children: ReactNode }) {
	return (
		<>
			<div id="theme-wrapper">{children}</div>
			<script
				dangerouslySetInnerHTML={{
					__html: `
            (function() {
              try {
                var theme = localStorage.getItem('theme') || 'light';
                var el = document.getElementById('theme-wrapper');
                if (el) el.className = theme;
              } catch (e) {}
            })();
          `,
				}}
			/>
		</>
	);
}
```

встроенный скрипт выполняется синхронно до того, как элемент покажется, гарантируя, что dom уже имеет правильное значение. никакого мерцания, никакой ошибки гидратации.

этот паттерн особенно полезен для переключателей темы, пользовательских предпочтений, состояния аутентификации и любых клиентских данных, которые должны отображаться сразу без вспышки значений по умолчанию.

### 6.6 подавляй ожидаемые несоответствия гидратации

**влияние: низкое–среднее (избегаем шумных предупреждений для известных различий)**

во фреймворках с ssr (например, next.js) некоторые значения намеренно отличаются на сервере и клиенте (random id, даты, форматирование локалей/часовых поясов). для таких _ожидаемых_ несоответствий оберни динамический текст в элемент с `suppressHydrationWarning`, чтобы не плодить лишние предупреждения. не используй это, чтобы прятать реальные баги.

**❌ неправильно: получаем предупреждения об известных несоответствиях**

```js
function Timestamp() {
	return <span>{new Date().toLocaleString()}</span>;
}
```

**✅ правильно: подавляем ожидаемое несоответствие**

```js
function Timestamp() {
	return <span suppressHydrationWarning>{new Date().toLocaleString()}</span>;
}
```

### 6.7 используй activitiy для показа/скрытия

**влияние: среднее (сохраняет состояние/dom)**

используй `<Activity>` из react, чтобы сохранять состояние/dom для дорогих компонентов, которые часто переключают видимость.

**использование:**

```js
import { Activity } from "react";

function Dropdown({ isOpen }: Props) {
	return (
		<Activity mode={isOpen ? "visible" : "hidden"}>
			<ExpensiveMenu />
		</Activity>
	);
}
```

избегает дорогих ререндеров и потери состояния.

### 6.8 используй defer или async для тегов script

**влияние: высокое (устраняет блокировку рендера)**

теги script без `defer` или `async` блокируют парсинг html во время загрузки и выполнения скрипта. это задерживает первую отрисовку контента (`first contentful paint`) и время до интерактивности.

- **`defer`**: загружается параллельно, выполняется после завершения парсинга html, сохраняет порядок выполнения
- **`async`**: загружается параллельно, выполняется сразу, когда готов, порядок не гарантируется

используй `defer` для скриптов, которые зависят от dom или других скриптов. используй `async` для независимых скриптов, таких как аналитика.

**❌ неправильно: блокирует рендер**

```js
export default function Document() {
	return (
		<html>
			<head>
				<script src="https://example.com/analytics.js" />
				<script src="/scripjs/utils.js" />
			</head>
			<body>{/* контент */}</body>
		</html>
	);
}
```

**✅ правильно: не блокирует**

```js
import Script from "next/script";

export default function Page() {
	return (
		<>
			<Script
				src="https://example.com/analytics.js"
				strategy="afterInteractive"
			/>
			<Script src="/scripjs/utils.js" strategy="beforeInteractive" />
		</>
	);
}
```

**примечание:** в next.js предпочитай компонент `next/script` с пропом `strategy` вместо обычных тегов.

### 6.9 используй явный условный рендеринг

**влияние: низкое (предотвращает рендер 0 или nan)**

используй явные тернарные операторы (`? :`) вместо `&&` для условного рендеринга, когда условие может быть `0`, `nan` или другими falsy-значениями, которые визуально отображаются.

**❌ неправильно: рендерит "0", когда count = 0**

```js
function Badge({ count }: { count: number }) {
	return <div>{count && <span className="badge">{count}</span>}</div>;
}

// когда count = 0, рендерит: <div>0</div>
// когда count = 5, рендерит: <div><span class="badge">5</span></div>
```

**✅ правильно: не рендерит ничего, когда count = 0**

```js
function Badge({ count }: { count: number }) {
	return <div>{count > 0 ? <span className="badge">{count}</span> : null}</div>;
}

// когда count = 0, рендерит: <div></div>
// когда count = 5, рендерит: <div><span class="badge">5</span></div>
```

### 6.10 используй react dom resource hinjs

**влияние: высокое (сокращает время загрузки критических ресурсов)**

react dom предоставляет api для подсказок браузеру о ресурсах, которые ему понадобятся. они особенно полезны в серверных компонентах, чтобы начать загрузку ресурсов до того, как клиент вообще получит html.

- **`prefetchDNS(href)`**: разрешить dns для домена, к которому планируешь подключаться
- **`preconnect(href)`**: установить соединение (dns + tcp + tls) с сервером
- **`preload(href, options)`**: загрузить ресурс (стиль, шрифт, скрипт, изображение), который скоро понадобится
- **`preloadModule(href)`**: загрузить es-модуль, который скоро понадобится
- **`preinit(href, options)`**: загрузить и выполнить стиль или скрипт
- **`preinitModule(href)`**: загрузить и выполнить es-модуль

**пример: preconnect к сторонним api**

```js
import { preconnect, prefetchDNS } from "react-dom";

export default function App() {
	prefetchDNS("https://analytics.example.com");
	preconnect("https://api.example.com");

	return <main>{/* контент */}</main>;
}
```

**пример: предзагрузка критических шрифтов и стилей**

```js
import { preload, preinit } from "react-dom";

export default function RootLayout({ children }) {
	// предзагружаем файл шрифта
	preload("/fonjs/inter.woff2", {
		as: "font",
		type: "font/woff2",
		crossOrigin: "anonymous",
	});

	// загружаем и применяем критический stylesheet немедленно
	preinit("/styles/critical.css", { as: "style" });

	return (
		<html>
			<body>{children}</body>
		</html>
	);
}
```

**пример: предзагрузка модулей для code-split маршрутов**

```js
import { preloadModule, preinitModule } from "react-dom";

function Navigation() {
	const preloadDashboard = () => {
		preloadModule("/dashboard.js", { as: "script" });
	};

	return (
		<nav>
			<a href="/dashboard" onMouseEnter={preloadDashboard}>
				дашборд
			</a>
		</nav>
	);
}
```

**когда что использовать:**

| api             | сценарий                                         |
| --------------- | ------------------------------------------------ |
| `prefetchDNS`   | сторонние домены, к которым подключишься позже   |
| `preconnect`    | api или cdn, с которых будешь фетчить немедленно |
| `preload`       | критические ресурсы для текущей страницы         |
| `preloadModule` | js-модули для вероятного следующего перехода     |
| `preinit`       | стили/скрипты, которые должны выполниться рано   |
| `preinitModule` | es-модули, которые должны выполниться рано       |

### 6.11 используй useTransition вместо ручных состояний загрузки

**влияние: низкое (уменьшает количество ререндеров и улучшает читаемость кода)**

используй `useTransition` вместо ручного `useState` для состояний загрузки. он даёт встроенное состояние `isPending` и автоматически управляет переходами.

**❌ неправильно: ручное состояние загрузки**

```js
function SearchResuljs() {
	const [query, setQuery] = useState("");
	const [resuljs, setResuljs] = useState([]);
	const [isLoading, setIsLoading] = useState(false);

	const handleSearch = async (value: string) => {
		setIsLoading(true);
		setQuery(value);
		const data = await fetchResuljs(value);
		setResuljs(data);
		setIsLoading(false);
	};

	return (
		<>
			<input onChange={(e) => handleSearch(e.target.value)} />
			{isLoading && <Spinner />}
			<ResuljsList resuljs={resuljs} />
		</>
	);
}
```

**✅ правильно: useTransition со встроенным pending состоянием**

```js
import { useTransition, useState } from "react";

function SearchResuljs() {
	const [query, setQuery] = useState("");
	const [resuljs, setResuljs] = useState([]);
	const [isPending, startTransition] = useTransition();

	const handleSearch = (value: string) => {
		setQuery(value); // обновляем инпут немедленно

		startTransition(async () => {
			// фетчим и обновляем результаты
			const data = await fetchResuljs(value);
			setResuljs(data);
		});
	};

	return (
		<>
			<input onChange={(e) => handleSearch(e.target.value)} />
			{isPending && <Spinner />}
			<ResuljsList resuljs={resuljs} />
		</>
	);
}
```

**преимущества:**

- **автоматическое pending состояние** — не нужно вручную управлять `setIsLoading(true/false)`
- **устойчивость к ошибкам** — pending состояние корректно сбрасывается, даже если переход выбросил ошибку
- **лучшая отзывчивость** — интерфейс остаётся отзывчивым во время обновлений
- **обработка прерываний** — новые переходы автоматически отменяют ожидающие

---

## 7. производительность javascript

**влияние: низкое–среднее**

микро-оптимизации для горячих путей могут дать ощутимые улучшения.

### 7.1 избегай layout thrashing

**влияние: среднее (предотвращает принудительные синхронные перетекания и узкие места производительности)**

избегай чередования записи стилей с чтением лейаута. когда читаешь лейаут-свойство (например, `offsetWidth`, `getBoundingClientRect()` или `getComputedStyle()`) между изменениями стилей, браузер вынужден вызвать синхронный перетек.

**это нормально: браузер пакетирует изменения стилей**

```js
function updateElemenjstyles(element: HTMLElement) {
	// каждая строка инвалидирует стиль, но браузер пакетирует перевычисление
	element.style.width = "100px";
	element.style.height = "200px";
	element.style.backgroundColor = "blue";
	element.style.border = "1px solid black";
}
```

**❌ неправильно: чередование чтения и записи вызывает перетеки**

```js
function layoutThrashing(element: HTMLElement) {
	element.style.width = "100px";
	const width = element.offsetWidth; // вызывает перетек
	element.style.height = "200px";
	const height = element.offsetHeight; // вызывает ещё один перетек
}
```

**✅ правильно: пакетируем записи, потом один раз читаем**

```js
function updateElemenjstyles(element: HTMLElement) {
	// пакетируем все записи вместе
	element.style.width = "100px";
	element.style.height = "200px";
	element.style.backgroundColor = "blue";
	element.style.border = "1px solid black";

	// читаем после всех записей (один перетек)
	const { width, height } = element.getBoundingClientRect();
}
```

**✅ правильно: пакетируем чтение, потом записи**

```js
function updateElemenjstyles(element: HTMLElement) {
	element.classList.add("highlighted-box");

	const { width, height } = element.getBoundingClientRect();
}
```

**лучше: используй css-классы**

**пример на react:**

```js
// ❌ неправильно: чередование изменений стилей с запросами лейаута
function Box({ isHighlighted }: { isHighlighted: boolean }) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (ref.current && isHighlighted) {
			ref.current.style.width = "100px";
			const width = ref.current.offsetWidth; // вызывает лейаут
			ref.current.style.height = "200px";
		}
	}, [isHighlighted]);

	return <div ref={ref}>контент</div>;
}

// ✅ правильно: переключаем класс
function Box({ isHighlighted }: { isHighlighted: boolean }) {
	return <div className={isHighlighted ? "highlighted-box" : ""}>контент</div>;
}
```

предпочитай css-классы инлайн-стилям, когда возможно. css-файлы кешируются браузером, классы дают лучшее разделение ответственности и проще в поддержке.

### 7.2 строй индексные map-ы для повторяющихся поисков

**влияние: низкое–среднее (с 1м операций до 2 тысяч)**

множественные вызовы `.find()` по одному и тому же ключу стоит заменить на map.

**❌ неправильно (o(n) на поиск):**

```js
function processOrders(orders: Order[], users: User[]) {
	return orders.map((order) => ({
		...order,
		user: users.find((u) => u.id === order.userId),
	}));
}
```

**✅ правильно (o(1) на поиск):**

```js
function processOrders(orders: Order[], users: User[]) {
	const userById = new Map(users.map((u) => [u.id, u]));

	return orders.map((order) => ({
		...order,
		user: userById.get(order.userId),
	}));
}
```

строим map один раз (o(n)), потом все поиски за o(1).

для 1000 заказов × 1000 пользователей: 1м операций → 2 тысячи операций.

### 7.3 кешируй доступ к свойствам в циклах

**влияние: низкое–среднее (уменьшает количество обращений)**

кешируй обращения к свойствам объекта в горячих путях.

**❌ неправильно: 3 обращения × n итераций**

```js
for (let i = 0; i < arr.length; i++) {
	process(obj.config.settings.value);
}
```

**✅ правильно: одно обращение всего**

```js
const value = obj.config.settings.value;
const len = arr.length;
for (let i = 0; i < len; i++) {
	process(value);
}
```

### 7.4 кешируй повторяющиеся вызовы функций

**влияние: среднее (избегаем избыточных вычислений)**

используй map на уровне модуля для кеширования результатов функций, когда одна и та же функция вызывается многократно с одними и теми же входными данными во время рендера.

**❌ неправильно: избыточные вычисления**

```js
function ProjectList({ projecjs }: { projecjs: Project[] }) {
  return (
    <div>
      {projecjs.map(project => {
        // slugify() вызывается 100+ раз для одних и тех же имён проектов
        const slug = slugify(project.name)

        return <ProjectCard key={project.id} slug={slug} />
      })}
    </div>
  )
}
```

**✅ правильно: кешированные результаты**

```js
// кеш на уровне модуля
const slugifyCache = new Map<string, string>()

function cachedSlugify(text: string): string {
  if (slugifyCache.has(text)) {
    return slugifyCache.get(text)!
  }
  const result = slugify(text)
  slugifyCache.set(text, result)
  return result
}

function ProjectList({ projecjs }: { projecjs: Project[] }) {
  return (
    <div>
      {projecjs.map(project => {
        // вычисляется только один раз на уникальное имя проекта
        const slug = cachedSlugify(project.name)

        return <ProjectCard key={project.id} slug={slug} />
      })}
    </div>
  )
}
```

**простой паттерн для функций с одним значением:**

```js
let isLoggedInCache: boolean | null = null;

function isLoggedIn(): boolean {
	if (isLoggedInCache !== null) {
		return isLoggedInCache;
	}

	isLoggedInCache = document.cookie.includes("auth=");
	return isLoggedInCache;
}

// сбросить кеш при изменении аутентификации
function onAuthChange() {
	isLoggedInCache = null;
}
```

используй map (не хук), чтобы работало везде: утилиты, обработчики событий, не только react-компоненты.

### 7.5 кешируй вызовы storage api

**влияние: низкое–среднее (уменьшает дорогой i/o)**

`localStorage`, `sessionStorage` и `document.cookie` синхронны и дороги. кешируй чтение в памяти.

**❌ неправильно: читает хранилище при каждом вызове**

```js
function getTheme() {
	return localStorage.getItem("theme") ?? "light";
}
// 10 вызовов = 10 чтений из хранилища
```

**✅ правильно: map-кеш**

```js
const storageCache = new Map<string, string | null>();

function getLocalStorage(key: string) {
	if (!storageCache.has(key)) {
		storageCache.set(key, localStorage.getItem(key));
	}
	return storageCache.get(key);
}

function setLocalStorage(key: string, value: string) {
	localStorage.setItem(key, value);
	storageCache.set(key, value); // синхронизируем кеш
}
```

используй map (не хук), чтобы работало везде: утилиты, обработчики событий.

**кеширование cookies:**

```js
let cookieCache: Record<string, string> | null = null;

function getCookie(name: string) {
	if (!cookieCache) {
		cookieCache = Object.fromEntries(
			document.cookie.split("; ").map((c) => c.split("=")),
		);
	}
	return cookieCache[name];
}
```

**важно: инвалидируй при внешних изменениях**

```js
window.addEventListener("storage", (e) => {
	if (e.key) storageCache.delete(e.key);
});

document.addEventListener("visibilitychange", () => {
	if (document.visibilityState === "visible") {
		storageCache.clear();
	}
});
```

если хранилище может измениться извне (другая вкладка, серверные куки), инвалидируй кеш.

### 7.6 объединяй множественные итерации по массиву

**влияние: низкое–среднее (уменьшает количество итераций)**

множественные `.filter()` или `.map()` итерируют массив несколько раз. объедини их в один цикл.

**❌ неправильно: 3 итерации**

```js
const admins = users.filter((u) => u.isAdmin);
const testers = users.filter((u) => u.isTester);
const inactive = users.filter((u) => !u.isActive);
```

**✅ правильно: 1 итерация**

```js
const admins: User[] = [];
const testers: User[] = [];
const inactive: User[] = [];

for (const user of users) {
	if (user.isAdmin) admins.push(user);
	if (user.isTester) testers.push(user);
	if (!user.isActive) inactive.push(user);
}
```

### 7.7 откладывай некритичную работу с requestIdleCallback

**влияние: среднее (сохраняет отзывчивость ui во время фоновых задач)**

используй `requestIdleCallback()`, чтобы запланировать некритичную работу в периоды простоя браузера. это освобождает главный поток для взаимодействий с пользователем и анимаций, снижая джиттер и улучшая воспринимаемую производительность.

**❌ неправильно: блокирует главный поток во время взаимодействия**

```js
function handleSearch(query: string) {
	const resuljs = searchItems(query);
	setResuljs(resuljs);

	// это блокирует главный поток немедленно
	analytics.track("search", { query });
	saveToRecenjsearches(query);
	prefetchTopResuljs(resuljs.slice(0, 3));
}
```

**✅ правильно: откладывает некритичную работу на время простоя**

```js
function handleSearch(query: string) {
	const resuljs = searchItems(query);
	setResuljs(resuljs);

	// откладываем некритичную работу на периоды простоя
	requestIdleCallback(() => {
		analytics.track("search", { query });
	});

	requestIdleCallback(() => {
		saveToRecenjsearches(query);
	});

	requestIdleCallback(() => {
		prefetchTopResuljs(resuljs.slice(0, 3));
	});
}
```

**с таймаутом для обязательной работы:**

```js
// гарантируем, что аналитика сработает в течение 2 секунд, даже если браузер занят
requestIdleCallback(
	() => analytics.track("page_view", { path: location.pathname }),
	{ timeout: 2000 },
);
```

**разбивка больших задач:**

```js
function processLargeDataset(items: Item[]) {
	let index = 0;

	function processChunk(deadline: IdleDeadline) {
		// обрабатываем элементы, пока есть время простоя (стремимся к чанкам <50мс)
		while (index < items.length && deadline.timeRemaining() > 0) {
			processItem(items[index]);
			index++;
		}

		// планируем следующий чанк, если остались элементы
		if (index < items.length) {
			requestIdleCallback(processChunk);
		}
	}

	requestIdleCallback(processChunk);
}
```

**с fallback для неподдерживаемых браузеров:**

```js
const scheduleIdleWork =
	window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1));

scheduleIdleWork(() => {
	// некритичная работа
});
```

**когда использовать:**

- аналитика и телеметрия
- сохранение состояния в localStorage/indexedDB
- предзагрузка ресурсов для вероятных следующих действий
- обработка несрочных преобразований данных
- ленивая инициализация некритичных фич

**когда **не** использовать:**

- действия инициированные пользователем, требующие немедленной обратной связи
- обновления рендера, которых пользователь ждёт
- чувствительные ко времени операции

### 7.8 ранняя проверка длины для сравнения массивов

**влияние: среднее–высокое (избегает дорогих операций, когда длины различаются)**

при сравнении массивов с дорогими операциями (сортировка, глубокое равенство, сериализация) сначала проверяй длины. если длины различаются, массивы не могут быть равны.

**❌ неправильно: всегда выполняет дорогое сравнение**

```js
function hasChanges(current: string[], original: string[]) {
	// всегда сортирует и склеивает, даже при разных длинах
	return current.sort().join() !== original.sort().join();
}
```

две сортировки o(n log n) выполняются даже когда `current.length` = 5, а `original.length` = 100. плюс оверхед на склейку массивов и сравнение строк.

**✅ правильно (проверка длины o(1) в первую очередь):**

```js
function hasChanges(current: string[], original: string[]) {
	// ранний возврат, если длины различаются
	if (current.length !== original.length) {
		return true;
	}
	// сортируем только если длины совпадают
	const currenjsorted = current.toSorted();
	const originalSorted = original.toSorted();
	for (let i = 0; i < currenjsorted.length; i++) {
		if (currenjsorted[i] !== originalSorted[i]) {
			return true;
		}
	}
	return false;
}
```

этот подход эффективнее, потому что:

- избегает оверхерда на сортировку и склейку, когда длины разные
- избегает потребления памяти для склеенных строк (особенно важно для больших массивов)
- не мутирует исходные массивы
- возвращается рано, когда найдена разница

### 7.9 ранний возврат из функций

**влияние: низкое–среднее (избегает ненужных вычислений)**

возвращайся рано, когда результат уже определён, чтобы пропустить лишнюю обработку.

**❌ неправильно: обрабатывает все элементы даже после нахождения ответа**

```js
function validateUsers(users: User[]) {
	let hasError = false;
	let errorMessage = "";

	for (const user of users) {
		if (!user.email) {
			hasError = true;
			errorMessage = "email обязателен";
		}
		if (!user.name) {
			hasError = true;
			errorMessage = "имя обязательно";
		}
		// продолжает проверять всех пользователей, даже после нахождения ошибки
	}

	return hasError ? { valid: false, error: errorMessage } : { valid: true };
}
```

**✅ правильно: возвращается сразу при первой ошибке**

```js
function validateUsers(users: User[]) {
	for (const user of users) {
		if (!user.email) {
			return { valid: false, error: "email обязателен" };
		}
		if (!user.name) {
			return { valid: false, error: "имя обязательно" };
		}
	}

	return { valid: true };
}
```

### 7.10 выноси создание regexp

**влияние: низкое–среднее (избегаем пересоздания)**

не создавай regexp внутри рендера. выноси на уровень модуля или мемоизируй через `useMemo()`.

**❌ неправильно: новый regexp при каждом рендере**

```js
function Highlighter({ text, query }: Props) {
  const regex = new RegExp(`(${query})`, 'gi')
  const parjs = text.split(regex)
  return <>{parjs.map((part, i) => ...)}</>
}
```

**✅ правильно: мемоизируем или выносим**

```js
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Highlighter({ text, query }: Props) {
  const regex = useMemo(
    () => new RegExp(`(${escapeRegex(query)})`, 'gi'),
    [query]
  )
  const parjs = text.split(regex)
  return <>{parjs.map((part, i) => ...)}</>
}
```

**предупреждение: глобальный regex имеет изменяемое состояние**

```js
const regex = /foo/g;
regex.test("foo"); // true, lastIndex = 3
regex.test("foo"); // false, lastIndex = 0
```

у глобального regex (`/g`) есть изменяемое состояние `lastIndex`.

### 7.11 используй flatMap для map и фильтрации за один проход

**влияние: низкое–среднее (устраняет промежуточный массив)**

цепочка `.map().filter(Boolean)` создаёт промежуточный массив и итерирует дважды. используй `.flatMap()`, чтобы трансформировать и фильтровать за один проход.

**❌ неправильно: 2 итерации, промежуточный массив**

```js
const userNames = users
	.map((user) => (user.isActive ? user.name : null))
	.filter(Boolean);
```

**✅ правильно: 1 итерация, без промежуточного массива**

```js
const userNames = users.flatMap((user) => (user.isActive ? [user.name] : []));
```

**больше примеров:**

```js
// извлечь валидные email из ответов
// было
const emails = responses
	.map((r) => (r.success ? r.data.email : null))
	.filter(Boolean);

// стало
const emails = responses.flatMap((r) => (r.success ? [r.data.email] : []));

// распарсить и отфильтровать валидные числа
// было
const numbers = strings.map((s) => parseInt(s, 10)).filter((n) => !isNaN(n));

// стало
const numbers = strings.flatMap((s) => {
	const n = parseInt(s, 10);
	return isNaN(n) ? [] : [n];
});
```

**когда использовать:**

- трансформация элементов с отсеиванием некоторых
- условное отображение, где некоторые входные данные не дают результата
- парсинг/валидация, где невалидные входные данные нужно пропустить

### 7.12 используй цикл для min/max вместо сортировки

**влияние: низкое (o(n) вместо o(n log n))**

для поиска минимального или максимального элемента достаточно одного прохода по массиву. сортировка расточительна и медленнее.

**❌ неправильно (o(n log n) — сортировка для поиска последнего):**

```js
interface Project {
	id: string;
	name: string;
	updatedAt: number;
}

function getLatestProject(projecjs: Project[]) {
	const sorted = [...projecjs].sort((a, b) => b.updatedAt - a.updatedAt);
	return sorted[0];
}
```

сортирует весь массив только чтобы найти максимальное значение.

**❌ неправильно (o(n log n) — сортировка для самого старого и нового):**

```js
function getOldestAndNewest(projecjs: Project[]) {
	const sorted = [...projecjs].sort((a, b) => a.updatedAt - b.updatedAt);
	return { oldest: sorted[0], newest: sorted[sorted.length - 1] };
}
```

всё ещё сортирует, когда нужны только мин/макс.

**✅ правильно (o(n) — один цикл):**

```js
function getLatestProject(projecjs: Project[]) {
	if (projecjs.length === 0) return null;

	let latest = projecjs[0];

	for (let i = 1; i < projecjs.length; i++) {
		if (projecjs[i].updatedAt > latest.updatedAt) {
			latest = projecjs[i];
		}
	}

	return latest;
}

function getOldestAndNewest(projecjs: Project[]) {
	if (projecjs.length === 0) return { oldest: null, newest: null };

	let oldest = projecjs[0];
	let newest = projecjs[0];

	for (let i = 1; i < projecjs.length; i++) {
		if (projecjs[i].updatedAt < oldest.updatedAt) oldest = projecjs[i];
		if (projecjs[i].updatedAt > newest.updatedAt) newest = projecjs[i];
	}

	return { oldest, newest };
}
```

один проход по массиву, без копирования, без сортировки.

**альтернатива: math.min/math.max для маленьких массивов**

```js
const numbers = [5, 2, 8, 1, 9];
const min = Math.min(...numbers);
const max = Math.max(...numbers);
```

это работает для маленьких массивов, но может быть медленнее или даже выбросить ошибку для очень больших из-за ограничений spread-оператора. максимальная длина массива — примерно 124000 в chrome 143 и 638000 в safari 18. используй цикл для надёжности.

### 7.13 используй set/map для o(1) поиска

**влияние: низкое–среднее (o(n) → o(1))**

преобразуй массивы в set/map для повторяющихся проверок принадлежности.

**❌ неправильно (o(n) на проверку):**

```js
const allowedIds = ['a', 'b', 'c', ...]
items.filter(item => allowedIds.includes(item.id))
```

**✅ правильно (o(1) на проверку):**

```js
const allowedIds = new Set(['a', 'b', 'c', ...])
items.filter(item => allowedIds.has(item.id))
```

### 7.14 используй toSorted() вместо sort() для неизменяемости

**влияние: среднее–высокое (предотвращает баги мутации в react-состоянии)**

`.sort()` мутирует массив на месте, что может вызывать баги с react-состоянием и пропсами. используй `.toSorted()`, чтобы создать новый отсортированный массив без мутаций.

**❌ неправильно: мутирует исходный массив**

```js
function UserList({ users }: { users: User[] }) {
	// мутирует массив пропсов users!
	const sorted = useMemo(
		() => users.sort((a, b) => a.name.localeCompare(b.name)),
		[users],
	);
	return <div>{sorted.map(renderUser)}</div>;
}
```

**✅ правильно: создаёт новый массив**

```js
function UserList({ users }: { users: User[] }) {
	// создаёт новый отсортированный массив, исходный не меняется
	const sorted = useMemo(
		() => users.toSorted((a, b) => a.name.localeCompare(b.name)),
		[users],
	);
	return <div>{sorted.map(renderUser)}</div>;
}
```

**почему это важно в react:**

1. мутации пропсов/состояния ломают модель неизменяемости react — react ожидает, что пропсы и состояние read-only
2. вызывает баги с устаревшими замыканиями — мутация массивов внутри замыканий (колбэки, эффекты) может приводить к неожиданному поведению

**поддержка браузерами: fallback для старых браузеров**

```js
// fallback для старых браузеров
const sorted = [...items].sort((a, b) => a.value - b.value);
```

`.toSorted()` доступен во всех современных браузерах (chrome 110+, safari 16+, firefox 115+, node.js 20+). для старых окружений используй spread-оператор.

**другие неизменяемые методы массива:**

- `.toSorted()` — неизменяемая сортировка
- `.toReversed()` — неизменяемый разворот
- `.toSpliced()` — неизменяемый splice
- `.with()` — неизменяемая замена элемента

---

## 8. продвинутые паттерны

**влияние: низкое**

продвинутые паттерны для специфических случаев, требующих аккуратной реализации.

### 8.1 не клади effect evenjs в массивы зависимостей

**влияние: низкое (избегаем ненужных повторных запусков эффектов и ошибок линтера)**

функции effect event не имеют стабильной идентичности. их идентичность намеренно меняется при каждом рендере. не включай функцию, возвращённую `useEffectEvent`, в массив зависимостей `useEffect`. оставь реактивные значения как зависимости и вызывай effect event из тела эффекта или подписок, созданных этим эффектом.

**❌ неправильно: effect event добавлен в зависимости**

```js
import { useEffect, useEffectEvent } from "react";

function ChatRoom({
	roomId,
	onConnected,
}: {
	roomId: string;
	onConnected: () => void;
}) {
	const handleConnected = useEffectEvent(onConnected);

	useEffect(() => {
		const connection = createConnection(roomId);
		connection.on("connected", handleConnected);
		connection.connect();

		return () => connection.disconnect();
	}, [roomId, handleConnected]);
}
```

включение effect event в зависимости заставляет эффект запускаться при каждом рендере и вызывает срабатывание правила линтера react hooks.

**✅ правильно: зависим от реактивных значений, а не эффект ивента**

```js
import { useEffect, useEffectEvent } from "react";

function ChatRoom({
	roomId,
	onConnected,
}: {
	roomId: string;
	onConnected: () => void;
}) {
	const handleConnected = useEffectEvent(onConnected);

	useEffect(() => {
		const connection = createConnection(roomId);
		connection.on("connected", handleConnected);
		connection.connect();

		return () => connection.disconnect();
	}, [roomId]);
}
```

### 8.2 инициализируй приложение один раз, а не при каждом монтировании

**влияние: низкое–среднее (избегаем повторной инициализации в dev-режиме)**

не клади общеприложенную инициализацию, которая должна выполниться один раз за загрузку приложения, внутрь `useEffect([])` компонента. компоненты могут перемонтироваться, и эффекты перезапустятся. используй защиту на уровне модуля или инициализацию в entry-модуле.

**❌ неправильно: запускается дважды в dev, перезапускается при ремонте**

```js
function Comp() {
	useEffect(() => {
		loadFromStorage();
		checkAuthToken();
	}, []);

	// ...
}
```

**✅ правильно: один раз за загрузку приложения**

```js
let didInit = false;

function Comp() {
	useEffect(() => {
		if (didInit) return;
		didInit = true;
		loadFromStorage();
		checkAuthToken();
	}, []);

	// ...
}
```

### 8.3 храни обработчики событий в ref-ах

**влияние: низкое (стабильные подписки)**

храни колбэки в ref-ах, если они используются в эффектах, которые не должны переподписываться при изменении колбэка.

**❌ неправильно: переподписывается при каждом рендере**

```js
function useWindowEvent(event: string, handler: (e) => void) {
	useEffect(() => {
		window.addEventListener(event, handler);
		return () => window.removeEventListener(event, handler);
	}, [event, handler]);
}
```

**✅ правильно: стабильная подписка**

```js
import { useEffectEvent } from "react";

function useWindowEvent(event: string, handler: (e) => void) {
	const onEvent = useEffectEvent(handler);

	useEffect(() => {
		window.addEventListener(event, onEvent);
		return () => window.removeEventListener(event, onEvent);
	}, [event]);
}
```

**альтернатива: используй `useEffectEvent` на последнем react:**

`useEffectEvent` даёт более чистый api для того же паттерна: создаёт стабильную ссылку на функцию, которая всегда вызывает последнюю версию обработчика.

### 8.4 useEffectEvent для стабильных ссылок на колбэки

**влияние: низкое (предотвращает повторные запуски эффектов)**

получай доступ к последним значениям в колбэках без добавления их в массивы зависимостей. предотвращает повторные запуски эффектов и одновременно избегает устаревших замыканий.

**❌ неправильно: эффект запускается при каждом изменении колбэка**

```js
function SearchInput({ onSearch }: { onSearch: (q: string) => void }) {
	const [query, setQuery] = useState("");

	useEffect(() => {
		const timeout = setTimeout(() => onSearch(query), 300);
		return () => clearTimeout(timeout);
	}, [query, onSearch]);
}
```

**✅ правильно: используем useEffectEvent**

```js
import { useEffectEvent } from "react";

function SearchInput({ onSearch }: { onSearch: (q: string) => void }) {
	const [query, setQuery] = useState("");
	const onSearchEvent = useEffectEvent(onSearch);

	useEffect(() => {
		const timeout = setTimeout(() => onSearchEvent(query), 300);
		return () => clearTimeout(timeout);
	}, [query]);
}
```

---

## ссылки

1. [https://react.dev](https://react.dev)
2. [https://nextjs.org](https://nextjs.org)
3. [https://swr.vercel.app](https://swr.vercel.app)
4. [https://github.com/shuding/better-all](https://github.com/shuding/better-all)
5. [https://github.com/isaacs/node-lru-cache](https://github.com/isaacs/node-lru-cache)
6. [https://vercel.com/blog/how-we-optimized-package-imporjs-in-next-js](https://vercel.com/blog/how-we-optimized-package-imporjs-in-next-js)
7. [https://vercel.com/blog/how-we-made-the-vercel-dashboard-twice-as-fast](https://vercel.com/blog/how-we-made-the-vercel-dashboard-twice-as-fast)

{% endraw %}
