---
title: лучшие практики react native для агентов [перевод]
description:
keywords:
date: 2026-05-06
tags: ["computer_science", "react_native", "переводы"]
---

{% raw %}

вольный перевод статьи от Vercel Engineering "[React Native Skills v1.0.0](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-native-skills/AGENTS.md)"

# лучшие практики react native

**версия 1.0.0**  
engineering  
январь 2026

> **примечание:**  
> этот документ в первую очередь для llm и агентов, которые поддерживают, генерируют или рефакторят react native код. людям он тоже может быть полезен, но ориентирован на автоматизацию и единообразие.

---

## о чём речь

практическое руководство по оптимизации react native приложений. внутри — 35+ правил, разбитых на 13 категорий, с приоритетами от критичных (рендеринг, списки) до малозначительных (шрифты, импорты). у каждого правила — подробное объяснение, сравнение неправильных и правильных примеров и метрики эффекта.

---

## 1. базовый рендеринг

**влияние: критичное**

фундаментальные правила рендеринга в react native. их нарушение приводит к падениям или сломанному интерфейсу.

### 1.1 никогда не используй && с потенциально falsy значениями

**влияние: критичное (предотвращает падение в проде)**

никогда не используй `{value && <Component />}` если `value` может быть пустой строкой или `0`. эти значения falsy, но jsx может их отрендерить — react native попытается показать их как текст вне компонента `<Text>`, что вызовет жёсткое падение в проде.

**❌ неправильно: падает, если count = 0 или name = ""**

```jsx
function Profile({ name, count }) {
	return (
		<View>
			{name && <Text>{name}</Text>}
			{count && <Text>{count} элементов</Text>}
		</View>
	);
}
// если name="" или count=0, рендерит falsy значение → падение
```

**✅ правильно: тернарник с null**

```jsx
function Profile({ name, count }) {
	return (
		<View>
			{name ? <Text>{name}</Text> : null}
			{count ? <Text>{count} элементов</Text> : null}
		</View>
	);
}
```

**✅ правильно: явное приведение к boolean**

```jsx
function Profile({ name, count }) {
	return (
		<View>
			{!!name && <Text>{name}</Text>}
			{!!count && <Text>{count} элементов</Text>}
		</View>
	);
}
```

**✅ лучше всего: ранний возврат**

```jsx
function Profile({ name, count }) {
	if (!name) return null;

	return (
		<View>
			<Text>{name}</Text>
			{count > 0 ? <Text>{count} элементов</Text> : null}
		</View>
	);
}
```

ранние возвраты — самые понятные. если используешь условные операторы инлайн, предпочитай тернарник или явные булевы проверки.

**линтер:** включи `react/jsx-no-leaked-render` из `eslint-plugin-react`, чтобы ловить это автоматически.

### 1.2 оборачивай строки в text компоненты

**влияние: критичное (предотвращает падение в рантайме)**

строки должны рендериться внутри `<Text>`. react native падает, если строка — прямой потомок `<View>`.

**❌ неправильно: падает**

```jsx
import { View } from "react-native";

function Greeting({ name }) {
	return <View>привет, {name}!</View>;
}
// ошибка: текстовые строки должны быть внутри компонента <Text>
```

**✅ правильно:**

```jsx
import { View, Text } from "react-native";

function Greeting({ name }) {
	return (
		<View>
			<Text>привет, {name}!</Text>
		</View>
	);
}
```

---

## 2. производительность списков

**влияние: высокое**

оптимизация виртуализированных списков (flatlist, legendlist, flashlist) для плавного скролла и быстрых обновлений.

### 2.1 избегай инлайн-объектов в renderitem

**влияние: высокое (предотвращает лишние ререндеры мемоизированных элементов списка)**

не создавай новые объекты внутри `renderItem` для передачи в пропсы. инлайн-объекты создают новые ссылки при каждом рендере, ломая мемоизацию. вместо этого передавай примитивные значения напрямую из `item`.

**❌ неправильно: инлайн-объект ломает мемоизацию**

```jsx
function UserList({ users }) {
	return (
		<LegendList
			data={users}
			renderItem={({ item }) => (
				<UserRow
					// плохо: новый объект при каждом рендере
					user={{ id: item.id, name: item.name, avatar: item.avatar }}
				/>
			)}
		/>
	);
}
```

**❌ неправильно: инлайн-объект стилей**

```jsx
renderItem={({ item }) => (
  <UserRow
    name={item.name}
    // плохо: новый объект стилей при каждом рендере
    style={{ backgroundColor: item.isActive ? 'green' : 'gray' }}
  />
)}
```

**✅ правильно: передавай item напрямую или примитивы**

```jsx
function UserList({ users }) {
	return (
		<LegendList
			data={users}
			renderItem={({ item }) => (
				// хорошо: передаём item напрямую
				<UserRow user={item} />
			)}
		/>
	);
}
```

**✅ правильно: передавай примитивы, вычисляй внутри ребёнка**

```jsx
renderItem={({ item }) => (
  <UserRow
    id={item.id}
    name={item.name}
    isActive={item.isActive}
  />
)}

const UserRow = memo(function UserRow({ id, name, isActive }) {
  // хорошо: вычисляем стиль внутри мемоизированного компонента
  const backgroundColor = isActive ? 'green' : 'gray'
  return <View style={[styles.row, { backgroundColor }]}>{/* ... */}</View>
})
```

**✅ правильно: выноси статические стили на уровень модуля**

```jsx
const activeStyle = { backgroundColor: 'green' }
const inactiveStyle = { backgroundColor: 'gray' }

renderItem={({ item }) => (
  <UserRow
    name={item.name}
    // хорошо: стабильные ссылки
    style={item.isActive ? activeStyle : inactiveStyle}
  />
)}
```

передача примитивов или стабильных ссылок позволяет `memo()` пропускать ререндеры, когда значения не изменились.

**примечание:** если у тебя включён react compiler, он сам обрабатывает мемоизацию, и ручные оптимизации становятся менее критичными.

### 2.2 выноси колбэки на уровень списка

**влияние: среднее (меньше ререндеров, быстрее списки)**

при передаче функций-колбэков в элементы списка создавай один экземпляр колбэка в корне списка. элементы должны вызывать его с уникальным идентификатором.

**❌ неправильно: создаёт новый колбэк при каждом рендере**

```jsx
return (
	<LegendList
		renderItem={({ item }) => {
			// плохо: создаёт новый колбэк при каждом рендере
			const onPress = () => handlePress(item.id);
			return <Item key={item.id} item={item} onPress={onPress} />;
		}}
	/>
);
```

**✅ правильно: один экземпляр функции, переданный в каждый элемент**

```jsx
const onPress = useCallback(() => handlePress(item.id), [handlePress, item.id]);

return (
	<LegendList
		renderItem={({ item }) => (
			<Item key={item.id} item={item} onPress={onPress} />
		)}
	/>
);
```

### 2.3 держи элементы списка лёгкими

**влияние: высокое (сокращает время рендера видимых элементов во время скролла)**

элементы списка должны быть максимально дёшевыми в рендере. минимизируй хуки, избегай запросов и ограничивай доступ к react context. виртуализированные списки рендерят много элементов во время скролла — тяжёлые элементы вызывают джиттер.

**❌ неправильно: тяжёлый элемент списка**

```jsx
function ProductRow({ id }) {
	// плохо: запрос внутри элемента списка
	const { data: product } = useQuery(["product", id], () => fetchProduct(id));
	// плохо: множественные обращения к контексту
	const theme = useContext(ThemeContext);
	const user = useContext(UserContext);
	const cart = useContext(CartContext);
	// плохо: дорогое вычисление
	const recommendations = useMemo(
		() => computeRecommendations(product),
		[product],
	);

	return <View>{/* ... */}</View>;
}
```

**✅ правильно: лёгкий элемент списка**

```jsx
function ProductRow({ name, price, imageUrl }) {
	// хорошо: получает только примитивы, минимум хуков
	return (
		<View>
			<Image source={{ uri: imageUrl }} />
			<Text>{name}</Text>
			<Text>{price}</Text>
		</View>
	);
}
```

**перенеси фетчинг данных в родителя:**

```jsx
// родитель фетчит все данные один раз
function ProductList() {
	const { data: products } = useQuery(["products"], fetchProducts);

	return (
		<LegendList
			data={products}
			renderItem={({ item }) => (
				<ProductRow name={item.name} price={item.price} imageUrl={item.image} />
			)}
		/>
	);
}
```

**для общих значений используй zustand селекторы вместо context:**

```jsx
// ❌ неправильно: context вызывает ререндер при любом изменении корзины
function ProductRow({ id, name }) {
	const { items } = useContext(CartContext);
	const inCart = items.includes(id);
	// ...
}

// ✅ правильно: zustand селектор ререндерит только при изменении этого конкретного значения
function ProductRow({ id, name }) {
	// используем Set.has (создан один раз в корне) вместо Array.includes()
	const inCart = useCartStore((s) => s.items.has(id));
	// ...
}
```

**правила для элементов списка:**

- никаких запросов или фетчинга данных
- никаких дорогих вычислений (выноси в родителя или мемоизируй на уровне родителя)
- предпочитай zustand селекторы вместо react context
- минимизируй хуки useState/useEffect
- передавай предвычисленные значения через пропсы

цель: элементы списка должны быть простыми функциями рендеринга, которые принимают пропсы и возвращают jsx.

### 2.4 оптимизируй списки через стабильные ссылки на объекты

**влияние: критичное (виртуализация полагается на стабильность ссылок)**

не применяй map или filter к данным перед передачей в виртуализированные списки. виртуализация полагается на стабильность ссылок на объекты, чтобы понять, что изменилось — новые ссылки вызывают полные ререндеры всех видимых элементов. старайся предотвращать частые рендеры на уровне родителя списка.

где нужно, используй селекторы контекста внутри элементов списка.

**❌ неправильно: создаёт новые ссылки на объекты при каждом нажатии клавиши**

```jsx
function DomainSearch() {
	const { keyword, setKeyword } = useKeywordZustandState();
	const { data: tlds } = useTlds();

	// плохо: создаёт новые объекты при каждом рендере, пересоздавая весь список при каждом нажатии
	const domains = tlds.map((tld) => ({
		domain: `${keyword}.${tld.name}`,
		tld: tld.name,
		price: tld.price,
	}));

	return (
		<>
			<TextInput value={keyword} onChangeText={setKeyword} />
			<LegendList
				data={domains}
				renderItem={({ item }) => <DomainItem item={item} keyword={keyword} />}
			/>
		</>
	);
}
```

**✅ правильно: стабильные ссылки, трансформация внутри элементов**

```jsx
const renderItem = ({ item }) => <DomainItem tld={item} />;

function DomainSearch() {
	const { data: tlds } = useTlds();

	return (
		<LegendList
			// хорошо: пока данные стабильны, LegendList не будет перерендеривать весь список
			data={tlds}
			renderItem={renderItem}
		/>
	);
}

function DomainItem({ tld }) {
	// хорошо: трансформируем внутри элементов и не передаём динамические данные как пропсы
	// хорошо: используем селектор из zustand для получения стабильной строки
	const domain = useKeywordZustandState((s) => s.keyword + "." + tld.name);
	return <Text>{domain}</Text>;
}
```

**обновление ссылки на массив в родителе:**

```jsx
// хорошо: создаёт новый экземпляр массива без мутации внутренних объектов
// хорошо: ссылка на родительский массив не меняется при наборе "keyword"
const sortedTlds = tlds.toSorted((a, b) => a.name.localeCompare(b.name));

return <LegendList data={sortedTlds} renderItem={renderItem} />;
```

создание нового экземпляра массива может быть нормальным, если ссылки на внутренние объекты стабильны. например, если сортируешь список объектов:

даже если это создаёт новый экземпляр массива `sortedTlds`, ссылки на внутренние объекты остаются стабильными.

**с zustand для динамических данных: избегает ререндеров родителя**

```jsx
function DomainItemFavoriteButton({ tld }) {
	const isFavorited = useFavoritesStore((s) => s.favorites.has(tld.id));
	return <TldFavoriteButton isFavorited={isFavorited} />;
}
```

теперь виртуализация может пропускать элементы, которые не изменились при наборе текста. при нажатии клавиши перерендериваются только видимые элементы (~20), а не весь родитель.

**вычисление состояния внутри элементов списка на основе данных родителя (избегает ререндеров родителя):**

для компонентов, где данные зависят от состояния родителя, этот паттерн ещё важнее. например, если проверяешь, добавлен ли элемент в избранное, переключение избранного перерендеривает только один компонент, если сам элемент отвечает за доступ к состоянию, а не родитель.

**примечание:** если используешь react compiler, можно читать значения react context напрямую внутри элементов списка. хотя это немного медленнее, чем использование zustand селектора в большинстве случаев, эффект может быть незначительным.

### 2.5 передавай примитивы в элементы списка для мемоизации

**влияние: высокое (позволяет эффективно работать memo())**

по возможности передавай только примитивные значения (строки, числа, булевы значения) как пропсы в компоненты элементов списка. примитивы позволяют поверхностному сравнению в `memo()` работать правильно, пропуская ререндеры, когда значения не изменились.

**❌ неправильно: объект-проп требует глубокого сравнения**

```jsx
const UserRow = memo(function UserRow({ user }) {
  // memo() сравнивает user по ссылке, а не по значению
  // если родитель создаёт новый объект user, этот компонент перерендерится, даже если данные те же
  return <Text>{user.name}</Text>
})

renderItem={({ item }) => <UserRow user={item} />}
```

это всё ещё можно оптимизировать, но мемоизировать правильно сложнее.

**✅ правильно: примитивные пропсы позволяют поверхностное сравнение**

```jsx
const UserRow = memo(function UserRow({ id, name, email }) {
  // memo() сравнивает каждый примитив напрямую
  // перерендер только если id, name или email реально изменились
  return <Text>{name}</Text>
})

renderItem={({ item }) => (
  <UserRow id={item.id} name={item.name} email={item.email} />
)}
```

**передавай только то, что нужно:**

```jsx
// ❌ неправильно: передаём весь item, а нужно только имя
<UserRow user={item} />

// ✅ правильно: передаём только поля, которые использует компонент
<UserRow name={item.name} avatarUrl={item.avatar} />
```

**для колбэков — выноси или используй id элемента:**

```jsx
// ❌ неправильно: инлайн-функция создаёт новую ссылку
<UserRow name={item.name} onPress={() => handlePress(item.id)} />

// ✅ правильно: передаём id, обрабатываем в ребёнке
<UserRow id={item.id} name={item.name} />

const UserRow = memo(function UserRow({ id, name }) {
  const handlePress = useCallback(() => {
    // используем id здесь
  }, [id])
  return <Pressable onPress={handlePress}><Text>{name}</Text></Pressable>
})
```

примитивные пропсы делают мемоизацию предсказуемой и эффективной.

**примечание:** если включён react compiler, `memo()` и `useCallback()` не нужны, но ссылки на объекты всё равно имеют значение.

### 2.6 используй виртуализатор списка для любого списка

**влияние: высокое (меньше памяти, быстрее монтирование)**

используй виртуализатор списка вроде legendlist или flashlist вместо scrollview с маппингом детей — даже для коротких списков. виртуализаторы рендерят только видимые элементы, уменьшая потребление памяти и время монтирования. scrollview рендерит всех детей сразу, что быстро становится дорогим.

**❌ неправильно: scrollview рендерит все элементы сразу**

```jsx
function Feed({ items }) {
	return (
		<ScrollView>
			{items.map((item) => (
				<ItemCard key={item.id} item={item} />
			))}
		</ScrollView>
	);
}
// 50 элементов = 50 смонтированных компонентов, даже если видно только 10
```

**✅ правильно: виртуализатор рендерит только видимые элементы**

```jsx
import { LegendList } from "@legendapp/list";

function Feed({ items }) {
	return (
		<LegendList
			data={items}
			// если не используешь react compiler, оберни эти функции в useCallback
			renderItem={({ item }) => <ItemCard item={item} />}
			keyExtractor={(item) => item.id}
			estimatedItemSize={80}
		/>
	);
}
// одновременно смонтировано только ~10-15 видимых элементов
```

**альтернатива: flashlist**

```jsx
import { FlashList } from "@shopify/flash-list";

function Feed({ items }) {
	return (
		<FlashList
			data={items}
			renderItem={({ item }) => <ItemCard item={item} />}
			keyExtractor={(item) => item.id}
		/>
	);
}
```

преимущества применимы к любому экрану с прокручиваемым контентом — профили, настройки, ленты, результаты поиска. по умолчанию используй виртуализацию.

### 2.7 используй сжатые изображения в списках

**влияние: высокое (быстрее загрузка, меньше памяти)**

всегда загружай сжатые изображения подходящего размера для списков. полноразмерные изображения потребляют чрезмерно много памяти и вызывают джиттер при скролле. запрашивай миниатюры у своего сервера или используй cdn с параметрами изменения размера.

**❌ неправильно: полноразмерные изображения**

```jsx
function ProductItem({ product }) {
	return (
		<View>
			{/* загружается изображение 4000x3000 для миниатюры 100x100 */}
			<Image
				source={{ uri: product.imageUrl }}
				style={{ width: 100, height: 100 }}
			/>
			<Text>{product.name}</Text>
		</View>
	);
}
```

**✅ правильно: запрашиваем изображение подходящего размера**

```jsx
function ProductItem({ product }) {
	// запрашиваем изображение 200x200 (2x для ретины)
	const thumbnailUrl = `${product.imageUrl}?w=200&h=200&fit=cover`;

	return (
		<View>
			<Image
				source={{ uri: thumbnailUrl }}
				style={{ width: 100, height: 100 }}
				contentFit="cover"
			/>
			<Text>{product.name}</Text>
		</View>
	);
}
```

используй оптимизированный компонент изображений со встроенным кешированием и поддержкой плейсхолдеров, например `expo-image` или `solitoimage` (который внутри использует `expo-image`). запрашивай изображения в 2 раза больше размера отображения для ретина-экранов.

### 2.8 используй типы элементов для гетерогенных списков

**влияние: высокое (эффективный ресайклинг, меньше перетасовок лейаута)**

когда в списке есть элементы разных типов (сообщения, изображения, заголовки и т.д.), добавь поле `type` в каждый элемент и укажи `getItemType` для списка. это распределяет элементы по разным пулам ресайклинга, чтобы компонент сообщения никогда не переиспользовался как компонент изображения.

**❌ неправильно: один компонент с условными операторами**

```jsx
type Item = { id: string; text?: string; imageUrl?: string; isHeader?: boolean }

function ListItem({ item }) {
  if (item.isHeader) {
    return <HeaderItem title={item.text} />
  }
  if (item.imageUrl) {
    return <ImageItem url={item.imageUrl} />
  }
  return <MessageItem text={item.text} />
}

function Feed({ items }) {
  return (
    <LegendList
      data={items}
      renderItem={({ item }) => <ListItem item={item} />}
      recycleItems
    />
  )
}
```

**✅ правильно: типизированные элементы с отдельными компонентами**

```jsx
type HeaderItem = { id: string; type: 'header'; title: string }
type MessageItem = { id: string; type: 'message'; text: string }
type ImageItem = { id: string; type: 'image'; url: string }
type FeedItem = HeaderItem | MessageItem | ImageItem

function Feed({ items }) {
  return (
    <LegendList
      data={items}
      keyExtractor={(item) => item.id}
      getItemType={(item) => item.type}
      renderItem={({ item }) => {
        switch (item.type) {
          case 'header':
            return <SectionHeader title={item.title} />
          case 'message':
            return <MessageRow text={item.text} />
          case 'image':
            return <ImageRow url={item.url} />
        }
      }}
      recycleItems
    />
  )
}
```

**почему это важно:**

```jsx
<LegendList
	data={items}
	keyExtractor={(item) => item.id}
	getItemType={(item) => item.type}
	getEstimatedItemSize={(index, item, itemType) => {
		switch (itemType) {
			case "header":
				return 48;
			case "message":
				return 72;
			case "image":
				return 300;
			default:
				return 72;
		}
	}}
	renderItem={({ item }) => {
		/* ... */
	}}
	recycleItems
/>
```

- **эффективность ресайклинга:** элементы одного типа используют общий пул
- **нет перетасовок лейаута:** заголовок никогда не переиспользуется как ячейка изображения
- **типобезопасность:** typescript может сузить тип элемента в каждой ветке
- **лучшая оценка размера:** используй `getEstimatedItemSize` с `itemType` для точных оценок по типу

---

## 3. анимация

**влияние: высокое**

gpu-ускоренные анимации, паттерны reanimated и избегание перетасовки рендера при жестах.

### 3.1 анимируй transform и opacity вместо свойств лейаута

**влияние: высокое (gpu-ускоренные анимации, без пересчёта лейаута)**

избегай анимации `width`, `height`, `top`, `left`, `margin` или `padding`. они вызывают пересчёт лейаута на каждом кадре. вместо этого используй `transform` (scale, translate) и `opacity`, которые работают на gpu без пересчёта лейаута.

**❌ неправильно: анимирует height, вызывает пересчёт лейаута на каждом кадре**

```jsx
import Animated, {
	useAnimatedStyle,
	withTiming,
} from "react-native-reanimated";

function CollapsiblePanel({ expanded }) {
	const animatedStyle = useAnimatedStyle(() => ({
		height: withTiming(expanded ? 200 : 0), // вызывает пересчёт лейаута на каждом кадре
		overflow: "hidden",
	}));

	return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
```

**✅ правильно: анимирует scaleY, gpu-ускорение**

```jsx
import Animated, {
	useAnimatedStyle,
	withTiming,
} from "react-native-reanimated";

function CollapsiblePanel({ expanded }) {
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scaleY: withTiming(expanded ? 1 : 0) }],
		opacity: withTiming(expanded ? 1 : 0),
	}));

	return (
		<Animated.View
			style={[{ height: 200, transformOrigin: "top" }, animatedStyle]}
		>
			{children}
		</Animated.View>
	);
}
```

**✅ правильно: анимирует translateY для слайд-анимаций**

```jsx
import Animated, {
	useAnimatedStyle,
	withTiming,
} from "react-native-reanimated";

function SlideIn({ visible }) {
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: withTiming(visible ? 0 : 100) }],
		opacity: withTiming(visible ? 1 : 0),
	}));

	return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
```

gpu-ускоренные свойства: `transform` (translate, scale, rotate), `opacity`. всё остальное вызывает пересчёт лейаута.

### 3.2 предпочитай usederivedvalue вместо useanimatedreaction

**влияние: среднее (чище код, автоматическое отслеживание зависимостей)**

когда нужно получить производное shared value из другого, используй `useDerivedValue` вместо `useAnimatedReaction`. derived values декларативны, автоматически отслеживают зависимости и возвращают значение, которое можно использовать напрямую. animated реакции — для сайд-эффектов, а не для производных значений.

**❌ неправильно: useAnimatedReaction для производных значений**

```jsx
import { useSharedValue, useAnimatedReaction } from "react-native-reanimated";

function MyComponent() {
	const progress = useSharedValue(0);
	const opacity = useSharedValue(1);

	useAnimatedReaction(
		() => progress.get(),
		(current) => {
			opacity.set(1 - current);
		},
	);

	// ...
}
```

**✅ правильно: useDerivedValue**

```jsx
import { useSharedValue, useDerivedValue } from "react-native-reanimated";

function MyComponent() {
	const progress = useSharedValue(0);

	const opacity = useDerivedValue(() => 1 - progress.get());

	// ...
}
```

используй `useAnimatedReaction` только для сайд-эффектов, которые не производят значение (например, вызов тактильной обратной связи, логирование, вызов `runOnJS`).

### 3.3 используй gesturedetector для анимированных состояний нажатия

**влияние: среднее (анимации на ui-потоке, более плавная обратная связь на нажатие)**

для анимированных состояний нажатия (scale, opacity при нажатии) используй `GestureDetector` с `Gesture.Tap()` и shared values вместо `onPressIn`/`onPressOut` от pressable. колбэки жестов работают на ui-потоке как ворклеты — без перехода в js-поток для анимации нажатия.

**❌ неправильно: pressable с колбэками в js-потоке**

```jsx
import { Pressable } from "react-native";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
} from "react-native-reanimated";

function AnimatedButton({ onPress }) {
	const scale = useSharedValue(1);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.get() }],
	}));

	return (
		<Pressable
			onPress={onPress}
			onPressIn={() => scale.set(withTiming(0.95))}
			onPressOut={() => scale.set(withTiming(1))}
		>
			<Animated.View style={animatedStyle}>
				<Text>нажми меня</Text>
			</Animated.View>
		</Pressable>
	);
}
```

**✅ правильно: gesturedetector с ворклетами на ui-потоке**

```jsx
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
	interpolate,
	runOnJS,
} from "react-native-reanimated";

function AnimatedButton({ onPress }) {
	// храним СОСТОЯНИЕ нажатия (0 = не нажат, 1 = нажат)
	const pressed = useSharedValue(0);

	const tap = Gesture.Tap()
		.onBegin(() => {
			pressed.set(withTiming(1));
		})
		.onFinalize(() => {
			pressed.set(withTiming(0));
		})
		.onEnd(() => {
			runOnJS(onPress)();
		});

	// вычисляем визуальные значения из состояния
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: interpolate(pressed.get(), [0, 1], [1, 0.95]) }],
	}));

	return (
		<GestureDetector gesture={tap}>
			<Animated.View style={animatedStyle}>
				<Text>нажми меня</Text>
			</Animated.View>
		</GestureDetector>
	);
}
```

храни **состояние** нажатия (0 или 1), затем вычисляй scale через `interpolate`. это сохраняет shared value как единственный источник правды. используй `runOnJS` для вызова js-функций из ворклетов. используй `.get()` и `.set()` для совместимости с react compiler.

---

## 4. производительность скролла

**влияние: высокое**

отслеживание позиции скролла без перетасовки рендера.

### 4.1 никогда не храни позицию скролла в usestate

**влияние: высокое (предотвращает перетасовку рендера во время скролла)**

никогда не храни позицию скролла в `useState`. события скролла срабатывают очень быстро — обновления состояния вызывают перетасовку рендера и пропуск кадров. используй reanimated shared value для анимаций или ref для не-реактивного отслеживания.

**❌ неправильно: useState вызывает джиттер**

```jsx
import { useState } from "react";
import { ScrollView } from "react-native";

function Feed() {
	const [scrollY, setScrollY] = useState(0);

	const onScroll = (e) => {
		setScrollY(e.nativeEvent.contentOffset.y); // ререндер на каждом кадре
	};

	return <ScrollView onScroll={onScroll} scrollEventThrottle={16} />;
}
```

**✅ правильно: reanimated для анимаций**

```jsx
import Animated, {
	useSharedValue,
	useAnimatedScrollHandler,
} from "react-native-reanimated";

function Feed() {
	const scrollY = useSharedValue(0);

	const onScroll = useAnimatedScrollHandler({
		onScroll: (e) => {
			scrollY.set(e.contentOffset.y); // работает на ui-потоке, без ререндера
		},
	});

	return <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} />;
}
```

**✅ правильно: ref для не-реактивного отслеживания**

```jsx
import { useRef } from "react";
import { ScrollView } from "react-native";

function Feed() {
	const scrollY = useRef(0);

	const onScroll = (e) => {
		scrollY.current = e.nativeEvent.contentOffset.y; // без ререндера
	};

	return <ScrollView onScroll={onScroll} scrollEventThrottle={16} />;
}
```

---

## 5. навигация

**влияние: высокое**

использование нативных навигаторов для стеков и табов вместо js-альтернатив.

### 5.1 используй нативные навигаторы для навигации

**влияние: высокое (нативная производительность, ui под платформу)**

всегда используй нативные навигаторы вместо js-реализаций. нативные навигаторы используют платформенные api (uinavigationcontroller на ios, fragment на android), давая лучшую производительность и нативное поведение.

**для стеков:** используй `@react-navigation/native-stack` или стандартный стек expo-router (который внутри использует native-stack). избегай `@react-navigation/stack`.

**для табов:** используй `react-native-bottom-tabs` (нативный) или нативные табы expo-router. избегай `@react-navigation/bottom-tabs`, если важен нативный вид.

**❌ неправильно: js-стек навигатор**

```jsx
import { createStackNavigator } from "@react-navigation/stack";

const Stack = createStackNavigator();

function App() {
	return (
		<Stack.Navigator>
			<Stack.Screen name="Home" component={HomeScreen} />
			<Stack.Screen name="Details" component={DetailsScreen} />
		</Stack.Navigator>
	);
}
```

**✅ правильно: нативный стек с react-navigation**

```jsx
import { createNativeStackNavigator } from "@react-navigation/native-stack";

const Stack = createNativeStackNavigator();

function App() {
	return (
		<Stack.Navigator>
			<Stack.Screen name="Home" component={HomeScreen} />
			<Stack.Screen name="Details" component={DetailsScreen} />
		</Stack.Navigator>
	);
}
```

**✅ правильно: expo-router по умолчанию использует нативный стек**

```jsx
// app/_layout.tsx
import { Stack } from "expo-router";

export default function Layout() {
	return <Stack />;
}
```

**❌ неправильно: js-нижние табы**

```jsx
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

const Tab = createBottomTabNavigator();

function App() {
	return (
		<Tab.Navigator>
			<Tab.Screen name="Home" component={HomeScreen} />
			<Tab.Screen name="Settings" component={SettingsScreen} />
		</Tab.Navigator>
	);
}
```

**✅ правильно: нативные нижние табы с react-navigation**

```jsx
import { createNativeBottomTabNavigator } from "@bottom-tabs/react-navigation";

const Tab = createNativeBottomTabNavigator();

function App() {
	return (
		<Tab.Navigator>
			<Tab.Screen
				name="Home"
				component={HomeScreen}
				options={{
					tabBarIcon: () => ({ sfSymbol: "house" }),
				}}
			/>
			<Tab.Screen
				name="Settings"
				component={SettingsScreen}
				options={{
					tabBarIcon: () => ({ sfSymbol: "gear" }),
				}}
			/>
		</Tab.Navigator>
	);
}
```

**✅ правильно: нативные табы expo-router**

```jsx
// app/(tabs)/_layout.tsx
import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
	return (
		<NativeTabs>
			<NativeTabs.Trigger name="index">
				<NativeTabs.Trigger.Label>главная</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon sf="house.fill" md="home" />
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="settings">
				<NativeTabs.Trigger.Label>настройки</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon sf="gear" md="settings" />
			</NativeTabs.Trigger>
		</NativeTabs>
	);
}
```

на ios нативные табы автоматически включают `contentInsetAdjustmentBehavior` на первом `ScrollView` в корне каждого экрана, так что контент корректно скроллится за полупрозрачной таб-барой. если нужно отключить это поведение, используй `disableAutomaticContentInsets` на триггере.

**❌ неправильно: кастомный компонент заголовка**

```jsx
<Stack.Screen
	name="Profile"
	component={ProfileScreen}
	options={{
		header: () => <CustomHeader title="профиль" />,
	}}
/>
```

**✅ правильно: нативные опции заголовка**

```jsx
<Stack.Screen
	name="Profile"
	component={ProfileScreen}
	options={{
		title: "профиль",
		headerLargeTitleEnabled: true,
		headerSearchBarOptions: {
			placeholder: "поиск",
		},
	}}
/>
```

нативные заголовки поддерживают большие заголовки на ios, поисковые строки, эффекты размытия и корректную обработку безопасных зон автоматически.

- **производительность:** нативные переходы и жесты работают на ui-потоке
- **платформенное поведение:** автоматические большие заголовки на ios, material design на android
- **системная интеграция:** скролл наверх при тапе на таб, предотвращение pip, корректные безопасные зоны
- **доступность:** функции доступности платформы работают автоматически

---

## 6. состояние в react

**влияние: среднее**

паттерны управления react-состоянием для избегания устаревших замыканий и лишних ререндеров.

### 6.1 минимизируй переменные состояния и вычисляй значения

**влияние: среднее (меньше ререндеров, меньше рассинхрона)**

используй как можно меньше переменных состояния. если значение можно вычислить из существующего состояния или пропсов, вычисляй его во время рендера вместо хранения в состоянии. избыточное состояние вызывает лишние ререндеры и может рассинхронизироваться.

**❌ неправильно: избыточное состояние**

```jsx
function Cart({ items }) {
	const [total, setTotal] = useState(0);
	const [itemCount, setItemCount] = useState(0);

	useEffect(() => {
		setTotal(items.reduce((sum, item) => sum + item.price, 0));
		setItemCount(items.length);
	}, [items]);

	return (
		<View>
			<Text>{itemCount} элементов</Text>
			<Text>всего: ${total}</Text>
		</View>
	);
}
```

**✅ правильно: производные значения**

```jsx
function Cart({ items }) {
	const total = items.reduce((sum, item) => sum + item.price, 0);
	const itemCount = items.length;

	return (
		<View>
			<Text>{itemCount} элементов</Text>
			<Text>всего: ${total}</Text>
		</View>
	);
}
```

**ещё пример:**

```jsx
// ❌ неправильно: храним и firstName, и lastName, И fullName
const [firstName, setFirstName] = useState("");
const [lastName, setLastName] = useState("");
const [fullName, setFullName] = useState("");

// ✅ правильно: вычисляем fullName
const [firstName, setFirstName] = useState("");
const [lastName, setLastName] = useState("");
const fullName = `${firstName} ${lastName}`;
```

состояние должно быть минимальным источником правды. всё остальное — производное.

### 6.2 используй fallback состояние вместо initialstate

**влияние: среднее (реактивные fallback без синхронизации)**

используй `undefined` как начальное состояние и нулевое слияние (`??`) для fallback к родительским или серверным значениям. состояние представляет только намерение пользователя — `undefined` означает "пользователь ещё не выбрал". это даёт реактивные fallback, которые обновляются при изменении источника, а не только при начальном рендере.

**❌ неправильно: синхронизирует состояние, теряет реактивность**

```jsx
function Toggle({ fallbackEnabled }) {
	const [enabled, setEnabled] = useState(fallbackEnabled);
	// если fallbackEnabled изменится, состояние устареет
	// состояние смешивает намерение пользователя со значением по умолчанию

	return <Switch value={enabled} onValueChange={setEnabled} />;
}
```

**✅ правильно: состояние — намерение пользователя, реактивный fallback**

```jsx
function Toggle({ fallbackEnabled }) {
	const [_enabled, setEnabled] = useState(undefined);
	const enabled = _enabled ?? fallbackEnabled;
	// undefined = пользователь не трогал, падаем на проп
	// если fallbackEnabled изменится, компонент отразит это
	// после того как пользователь взаимодействовал, его выбор сохраняется

	return <Switch value={enabled} onValueChange={setEnabled} />;
}
```

**с серверными данными:**

```jsx
function ProfileForm({ data }) {
	const [_theme, setTheme] = useState(undefined);
	const theme = _theme ?? data.theme;
	// показывает значение с сервера, пока пользователь не переопределит
	// повторная загрузка сервера автоматически обновит fallback

	return <ThemePicker value={theme} onChange={setTheme} />;
}
```

### 6.3 используй функциональные обновления setstate для состояния, зависящего от текущего значения

**влияние: среднее (избегает устаревших замыканий)**

когда следующее состояние зависит от текущего, используй функциональное обновление (`setState(prev => ...)`) вместо прямого чтения переменной состояния в колбэке. это избегает устаревших замыканий и гарантирует сравнение с актуальным значением.

**❌ неправильно: читает состояние напрямую**

```jsx
const [size, setSize] = useState(undefined);

const onLayout = (e) => {
	const { width, height } = e.nativeEvent.layout;
	// size может быть устаревшим в этом замыкании
	if (size?.width !== width || size?.height !== height) {
		setSize({ width, height });
	}
};
```

**✅ правильно: функциональное обновление**

```jsx
const [size, setSize] = useState(undefined);

const onLayout = (e) => {
	const { width, height } = e.nativeEvent.layout;
	setSize((prev) => {
		if (prev?.width === width && prev?.height === height) return prev;
		return { width, height };
	});
};
```

возврат предыдущего значения из updater-функции пропускает ререндер.

для примитивных состояний не нужно сравнивать значения перед триггером ререндера.

**❌ неправильно: ненужное сравнение для примитивного состояния**

```jsx
const [size, setSize] = useState(undefined);

const onLayout = (e) => {
	const { width } = e.nativeEvent.layout;
	setSize((prev) => (prev === width ? prev : width));
};
```

**✅ правильно: устанавливает примитивное состояние напрямую**

```jsx
const [size, setSize] = useState(undefined);

const onLayout = (e) => {
	const { width } = e.nativeEvent.layout;
	setSize(width);
};
```

однако если следующее состояние зависит от текущего, всё равно используй функциональное обновление.

**❌ неправильно: читает состояние напрямую из колбэка**

```jsx
const [count, setCount] = useState(0);

const onTap = () => {
	setCount(count + 1);
};
```

**✅ правильно: функциональное обновление**

```jsx
const [count, setCount] = useState(0);

const onTap = () => {
	setCount((prev) => prev + 1);
};
```

---

## 7. архитектура состояния

**влияние: среднее**

принципы единого источника правды для переменных состояния и производных значений.

### 7.1 состояние должно представлять истинную картину

**влияние: высокое (чище логика, проще отладка, единый источник правды)**

переменные состояния — и react `useState`, и reanimated shared values — должны представлять реальное состояние чего-либо (например, `pressed`, `progress`, `isOpen`), а не производные визуальные значения (например, `scale`, `opacity`, `translateY`). визуальные значения вычисляются из состояния с помощью вычислений или интерполяции.

**❌ неправильно: храним визуальный результат**

```jsx
const scale = useSharedValue(1);

const tap = Gesture.Tap()
	.onBegin(() => {
		scale.set(withTiming(0.95));
	})
	.onFinalize(() => {
		scale.set(withTiming(1));
	});

const animatedStyle = useAnimatedStyle(() => ({
	transform: [{ scale: scale.get() }],
}));
```

**✅ правильно: храним состояние, вычисляем визуал**

```jsx
const pressed = useSharedValue(0); // 0 = не нажат, 1 = нажат

const tap = Gesture.Tap()
	.onBegin(() => {
		pressed.set(withTiming(1));
	})
	.onFinalize(() => {
		pressed.set(withTiming(0));
	});

const animatedStyle = useAnimatedStyle(() => ({
	transform: [{ scale: interpolate(pressed.get(), [0, 1], [1, 0.95]) }],
}));
```

**почему это важно:**

переменные состояния должны представлять реальное "состояние", а не обязательно желаемый конечный результат.

1. **единый источник правды** — состояние (`pressed`) описывает, что происходит; визуал вычисляется
2. **легче расширять** — добавление opacity, вращения или других эффектов требует только больше интерполяций из того же состояния
3. **отладка** — смотреть на `pressed = 1` понятнее, чем на `scale = 0.95`
4. **переиспользование логики** — одно и то же значение `pressed` может управлять несколькими визуальными свойствами

**тот же принцип для react состояния:**

```jsx
// ❌ неправильно: храним производные значения
const [isExpanded, setIsExpanded] = useState(false);
const [height, setHeight] = useState(0);

useEffect(() => {
	setHeight(isExpanded ? 200 : 0);
}, [isExpanded]);

// ✅ правильно: вычисляем из состояния
const [isExpanded, setIsExpanded] = useState(false);
const height = isExpanded ? 200 : 0;
```

состояние — это минимальная правда. всё остальное — производное.

---

## 8. react compiler

**влияние: среднее**

паттерны совместимости react compiler с react native и reanimated.

### 8.1 деструктурируй функции в начале рендера (react compiler)

**влияние: высокое (стабильные ссылки, меньше ререндеров)**

это правило применимо только если используешь react compiler.

деструктурируй функции из хуков в начале рендера. никогда не используй точечную нотацию для вызова функций. деструктурированные функции имеют стабильные ссылки; точечная нотация создаёт новые ссылки и ломает мемоизацию.

**❌ неправильно: точечная нотация в объекте**

```jsx
import { useRouter } from "expo-router";

function SaveButton(props) {
	const router = useRouter();

	// плохо: react compiler будет кешировать на основе "props" и "router" — объектах, которые меняются при каждом рендере
	const handlePress = () => {
		props.onSave();
		router.push("/success"); // нестабильная ссылка
	};

	return <Button onPress={handlePress}>сохранить</Button>;
}
```

**✅ правильно: деструктурируем заранее**

```jsx
import { useRouter } from "expo-router";

function SaveButton({ onSave }) {
	const { push } = useRouter();

	// хорошо: react compiler будет кешировать на основе push и onSave
	const handlePress = () => {
		onSave();
		push("/success"); // стабильная ссылка
	};

	return <Button onPress={handlePress}>сохранить</Button>;
}
```

### 8.2 используй .get() и .set() для reanimated shared values (не .value)

**влияние: низкое (требуется для совместимости с react compiler)**

при включённом react compiler используй `.get()` и `.set()` вместо прямого чтения или записи `.value` у reanimated shared values. компилятор не может отследить доступ к свойству — явные методы гарантируют корректное поведение.

**❌ неправильно: ломается с react compiler**

```jsx
import { useSharedValue } from "react-native-reanimated";

function Counter() {
	const count = useSharedValue(0);

	const increment = () => {
		count.value = count.value + 1; // отключает react compiler
	};

	return <Button onPress={increment} title={`счёт: ${count.value}`} />;
}
```

**✅ правильно: совместимо с react compiler**

```jsx
import { useSharedValue } from "react-native-reanimated";

function Counter() {
	const count = useSharedValue(0);

	const increment = () => {
		count.set(count.get() + 1);
	};

	return <Button onPress={increment} title={`счёт: ${count.get()}`} />;
}
```

---

## 9. пользовательский интерфейс

**влияние: среднее**

нативные ui-паттерны для изображений, меню, модальных окон, стилей и платформенно-консистентных интерфейсов.

### 9.1 измерение размеров вью

**влияние: среднее (синхронное измерение, избегаем лишних ререндеров)**

используй и `useLayoutEffect` (синхронный), и `onLayout` (для обновлений). синхронное измерение даёт начальный размер сразу; `onLayout` поддерживает его актуальным при изменении вью. для не-примитивного состояния используй функциональное обновление для сравнения значений и избегания лишних ререндеров.

**только высота:**

```jsx
import { useLayoutEffect, useRef, useState } from "react";
import { View } from "react-native";

function MeasuredBox({ children }) {
	const ref = useRef(null);
	const [height, setHeight] = useState(undefined);

	useLayoutEffect(() => {
		// синхронное измерение при монтировании (rn 0.82+)
		const rect = ref.current?.getBoundingClientRect();
		if (rect) setHeight(rect.height);
		// до 0.82: ref.current?.measure((x, y, w, h) => setHeight(h))
	}, []);

	const onLayout = (e) => {
		setHeight(e.nativeEvent.layout.height);
	};

	return (
		<View ref={ref} onLayout={onLayout}>
			{children}
		</View>
	);
}
```

**оба измерения:**

```jsx
import { useLayoutEffect, useRef, useState } from "react";
import { View } from "react-native";

function MeasuredBox({ children }) {
	const ref = useRef(null);
	const [size, setSize] = useState(undefined);

	useLayoutEffect(() => {
		const rect = ref.current?.getBoundingClientRect();
		if (rect) setSize({ width: rect.width, height: rect.height });
	}, []);

	const onLayout = (e) => {
		const { width, height } = e.nativeEvent.layout;
		setSize((prev) => {
			// для не-примитивного состояния сравниваем значения перед триггером ререндера
			if (prev?.width === width && prev?.height === height) return prev;
			return { width, height };
		});
	};

	return (
		<View ref={ref} onLayout={onLayout}>
			{children}
		</View>
	);
}
```

используй функциональный setState для сравнения — не читай состояние напрямую в колбэке.

### 9.2 современные паттерны стилизации в react native

**влияние: среднее (консистентный дизайн, плавные бордеры, чистые лейауты)**

следуй этим паттернам стилизации для более чистого и консистентного кода.

**всегда используй `borderCurve: 'continuous'` вместе с `borderRadius`.**

**используй `gap` вместо margin для расстояния между элементами:**

```jsx
// ❌ неправильно – margin на детях
<View>
  <Text style={{ marginBottom: 8 }}>заголовок</Text>
  <Text style={{ marginBottom: 8 }}>подзаголовок</Text>
</View>

// ✅ правильно – gap на родителе
<View style={{ gap: 8 }}>
  <Text>заголовок</Text>
  <Text>подзаголовок</Text>
</View>
```

**используй `padding` для отступов внутри, `gap` для расстояния между:**

```jsx
<View style={{ padding: 16, gap: 12 }}>
	<Text>первый</Text>
	<Text>второй</Text>
</View>
```

**используй `experimental_backgroundImage` для линейных градиентов:**

```jsx
// ❌ неправильно – сторонняя библиотека градиентов
<LinearGradient colors={['#000', '#fff']} />

// ✅ правильно – нативный css-синтаксис градиентов
<View
  style={{
    experimental_backgroundImage: 'linear-gradient(to bottom, #000, #fff)',
  }}
/>
```

**используй css-синтаксис `boxShadow` строкой:**

```jsx
// ❌ неправильно – устаревшие объекты теней
{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 }

// ✅ правильно – css-синтаксис box-shadow
{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }
```

**избегай множественных размеров шрифтов — используй вес и цвет для акцентов:**

```jsx
// ❌ неправильно – разные размеры шрифтов для иерархии
<Text style={{ fontSize: 18 }}>заголовок</Text>
<Text style={{ fontSize: 14 }}>подзаголовок</Text>
<Text style={{ fontSize: 12 }}>подпись</Text>

// ✅ правильно – одинаковый размер, разные вес и цвет
<Text style={{ fontWeight: '600' }}>заголовок</Text>
<Text style={{ color: '#666' }}>подзаголовок</Text>
<Text style={{ color: '#999' }}>подпись</Text>
```

ограничение числа размеров шрифтов создаёт визуальную консистентность. используй `fontWeight` (bold/semibold) и оттенки серого для иерархии.

### 9.3 используй contentinset для динамических отступов в scrollview

**влияние: низкое (более плавные обновления, без пересчёта лейаута)**

при добавлении отступа сверху или снизу у scrollview, который может меняться (клавиатура, тулбары, динамический контент), используй `contentInset` вместо padding. изменение `contentInset` не вызывает пересчёт лейаута — оно просто корректирует область скролла без перерендера контента.

**❌ неправильно: padding вызывает пересчёт лейаута**

```jsx
function Feed({ bottomOffset }) {
	return (
		<ScrollView contentContainerStyle={{ paddingBottom: bottomOffset }}>
			{children}
		</ScrollView>
	);
}
// изменение bottomOffset вызывает полный пересчёт лейаута
```

**✅ правильно: contentInset для динамических отступов**

```jsx
function Feed({ bottomOffset }) {
	return (
		<ScrollView
			contentInset={{ bottom: bottomOffset }}
			scrollIndicatorInsets={{ bottom: bottomOffset }}
		>
			{children}
		</ScrollView>
	);
}
// изменение bottomOffset только корректирует границы скролла
```

используй `scrollIndicatorInsets` вместе с `contentInset`, чтобы индикатор скролла оставался на месте. для статических отступов, которые никогда не меняются, padding подходит.

### 9.4 используй contentinsetadjustmentbehavior для безопасных зон

**влияние: среднее (нативная обработка безопасных зон, без скачков лейаута)**

используй `contentInsetAdjustmentBehavior="automatic"` на корневом scrollview вместо обёртки в safeareaview или ручных отступов. это позволяет ios обрабатывать безопасные зоны нативно с правильным скролл-поведением.

**❌ неправильно: обёртка safeareaview**

```jsx
import { SafeAreaView, ScrollView, View, Text } from "react-native";

function MyScreen() {
	return (
		<SafeAreaView style={{ flex: 1 }}>
			<ScrollView>
				<View>
					<Text>контент</Text>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
```

**❌ неправильно: ручные безопасные зоны**

```jsx
import { ScrollView, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function MyScreen() {
	const insets = useSafeAreaInsets();

	return (
		<ScrollView contentContainerStyle={{ paddingTop: insets.top }}>
			<View>
				<Text>контент</Text>
			</View>
		</ScrollView>
	);
}
```

**✅ правильно: нативная настройка content inset**

```jsx
import { ScrollView, View, Text } from "react-native";

function MyScreen() {
	return (
		<ScrollView contentInsetAdjustmentBehavior="automatic">
			<View>
				<Text>контент</Text>
			</View>
		</ScrollView>
	);
}
```

нативный подход обрабатывает динамические безопасные зоны (клавиатура, тулбары) и позволяет контенту скроллиться под статус-бар естественным образом.

### 9.5 используй expo-image для оптимизированных изображений

**влияние: высокое (эффективность памяти, кеширование, blurhash плейсхолдеры, прогрессивная загрузка)**

используй `expo-image` вместо стандартного `Image` из react native. он даёт эффективное кеширование, blurhash плейсхолдеры, прогрессивную загрузку и лучшую производительность в списках.

**❌ неправильно: react native image**

```jsx
import { Image } from "react-native";

function Avatar({ url }) {
	return <Image source={{ uri: url }} style={styles.avatar} />;
}
```

**✅ правильно: expo-image**

```jsx
import { Image } from "expo-image";

function Avatar({ url }) {
	return <Image source={{ uri: url }} style={styles.avatar} />;
}
```

**с blurhash плейсхолдером:**

```jsx
<Image
	source={{ uri: url }}
	placeholder={{ blurhash: "LGF5]+Yk^6#M@-5c,1J5@[or[Q6." }}
	contentFit="cover"
	transition={200}
	style={styles.image}
/>
```

**с приоритетом и кешированием:**

```jsx
<Image
	source={{ uri: url }}
	priority="high"
	cachePolicy="memory-disk"
	style={styles.hero}
/>
```

**ключевые пропсы:**

- `placeholder` — blurhash или миниатюра во время загрузки
- `contentFit` — `cover`, `contain`, `fill`, `scale-down`
- `transition` — длительность fade-in (мс)
- `priority` — `low`, `normal`, `high`
- `cachePolicy` — `memory`, `disk`, `memory-disk`, `none`
- `recyclingKey` — уникальный ключ для ресайклинга в списках

для кросс-платформенности (web + native) используй `SolitoImage` из `solito/image`, который внутри использует `expo-image`.

### 9.6 используй galeria для галерей изображений и лайтбокса

**влияние: среднее**

для галерей изображений с лайтбоксом (тап на весь экран) используй `@nandorojo/galeria`. она даёт нативные shared element переходы с pinch-to-zoom, двойным тапом для зума и свайпом для закрытия. работает с любым компонентом изображений, включая `expo-image`.

**❌ неправильно: кастомная модальная реализация**

```jsx
function ImageGallery({ urls }) {
	const [selected, setSelected] = useState(null);

	return (
		<>
			{urls.map((url) => (
				<Pressable key={url} onPress={() => setSelected(url)}>
					<Image source={{ uri: url }} style={styles.thumbnail} />
				</Pressable>
			))}
			<Modal visible={!!selected} onRequestClose={() => setSelected(null)}>
				<Image source={{ uri: selected }} style={styles.fullscreen} />
			</Modal>
		</>
	);
}
```

**✅ правильно: galeria с expo-image**

```jsx
import { Galeria } from "@nandorojo/galeria";
import { Image } from "expo-image";

function ImageGallery({ urls }) {
	return (
		<Galeria urls={urls}>
			{urls.map((url, index) => (
				<Galeria.Image index={index} key={url}>
					<Image source={{ uri: url }} style={styles.thumbnail} />
				</Galeria.Image>
			))}
		</Galeria>
	);
}
```

**одно изображение:**

```jsx
import { Galeria } from "@nandorojo/galeria";
import { Image } from "expo-image";

function Avatar({ url }) {
	return (
		<Galeria urls={[url]}>
			<Galeria.Image>
				<Image source={{ uri: url }} style={styles.avatar} />
			</Galeria.Image>
		</Galeria>
	);
}
```

**с низкоразрешенными миниатюрами и полноразмерными изображениями:**

```jsx
<Galeria urls={highResUrls}>
	{lowResUrls.map((url, index) => (
		<Galeria.Image index={index} key={url}>
			<Image source={{ uri: url }} style={styles.thumbnail} />
		</Galeria.Image>
	))}
</Galeria>
```

**с flashlist:**

```jsx
<Galeria urls={urls}>
	<FlashList
		data={urls}
		renderItem={({ item, index }) => (
			<Galeria.Image index={index}>
				<Image source={{ uri: item }} style={styles.thumbnail} />
			</Galeria.Image>
		)}
		numColumns={3}
		estimatedItemSize={100}
	/>
</Galeria>
```

работает с `expo-image`, `SolitoImage`, `react-native` image или любым компонентом изображений.

### 9.7 используй нативные меню для выпадающих списков и контекстных меню

**влияние: высокое (нативная доступность, платформенно-консистентный ux)**

используй нативные платформенные меню вместо кастомных js-реализаций. нативные меню дают встроенную доступность, консистентный ux на платформе и лучшую производительность. используй [zeego](https://zeego.dev) для кросс-платформенных нативных меню.

**❌ неправильно: кастомное js-меню**

```jsx
import { useState } from "react";
import { View, Pressable, Text } from "react-native";

function MyMenu() {
	const [open, setOpen] = useState(false);

	return (
		<View>
			<Pressable onPress={() => setOpen(!open)}>
				<Text>открыть меню</Text>
			</Pressable>
			{open && (
				<View style={{ position: "absolute", top: 40 }}>
					<Pressable onPress={() => console.log("edit")}>
						<Text>редактировать</Text>
					</Pressable>
					<Pressable onPress={() => console.log("delete")}>
						<Text>удалить</Text>
					</Pressable>
				</View>
			)}
		</View>
	);
}
```

**✅ правильно: нативное меню с zeego**

```jsx
import * as DropdownMenu from "zeego/dropdown-menu";

function MyMenu() {
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				<Pressable>
					<Text>открыть меню</Text>
				</Pressable>
			</DropdownMenu.Trigger>

			<DropdownMenu.Content>
				<DropdownMenu.Item key="edit" onSelect={() => console.log("edit")}>
					<DropdownMenu.ItemTitle>редактировать</DropdownMenu.ItemTitle>
				</DropdownMenu.Item>

				<DropdownMenu.Item
					key="delete"
					destructive
					onSelect={() => console.log("delete")}
				>
					<DropdownMenu.ItemTitle>удалить</DropdownMenu.ItemTitle>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	);
}
```

**контекстное меню: долгое нажатие**

```jsx
import * as ContextMenu from "zeego/context-menu";

function MyContextMenu() {
	return (
		<ContextMenu.Root>
			<ContextMenu.Trigger>
				<View style={{ padding: 20 }}>
					<Text>нажми и держи</Text>
				</View>
			</ContextMenu.Trigger>

			<ContextMenu.Content>
				<ContextMenu.Item key="copy" onSelect={() => console.log("copy")}>
					<ContextMenu.ItemTitle>копировать</ContextMenu.ItemTitle>
				</ContextMenu.Item>

				<ContextMenu.Item key="paste" onSelect={() => console.log("paste")}>
					<ContextMenu.ItemTitle>вставить</ContextMenu.ItemTitle>
				</ContextMenu.Item>
			</ContextMenu.Content>
		</ContextMenu.Root>
	);
}
```

**элементы с чекбоксами:**

```jsx
import * as DropdownMenu from "zeego/dropdown-menu";

function SettingsMenu() {
	const [notifications, setNotifications] = useState(true);

	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				<Pressable>
					<Text>настройки</Text>
				</Pressable>
			</DropdownMenu.Trigger>

			<DropdownMenu.Content>
				<DropdownMenu.CheckboxItem
					key="notifications"
					value={notifications}
					onValueChange={() => setNotifications((prev) => !prev)}
				>
					<DropdownMenu.ItemIndicator />
					<DropdownMenu.ItemTitle>уведомления</DropdownMenu.ItemTitle>
				</DropdownMenu.CheckboxItem>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	);
}
```

**подменю:**

```jsx
import * as DropdownMenu from "zeego/dropdown-menu";

function MenuWithSubmenu() {
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				<Pressable>
					<Text>опции</Text>
				</Pressable>
			</DropdownMenu.Trigger>

			<DropdownMenu.Content>
				<DropdownMenu.Item key="home" onSelect={() => console.log("home")}>
					<DropdownMenu.ItemTitle>главная</DropdownMenu.ItemTitle>
				</DropdownMenu.Item>

				<DropdownMenu.Sub>
					<DropdownMenu.SubTrigger key="more">
						<DropdownMenu.ItemTitle>ещё опции</DropdownMenu.ItemTitle>
					</DropdownMenu.SubTrigger>

					<DropdownMenu.SubContent>
						<DropdownMenu.Item key="settings">
							<DropdownMenu.ItemTitle>настройки</DropdownMenu.ItemTitle>
						</DropdownMenu.Item>

						<DropdownMenu.Item key="help">
							<DropdownMenu.ItemTitle>помощь</DropdownMenu.ItemTitle>
						</DropdownMenu.Item>
					</DropdownMenu.SubContent>
				</DropdownMenu.Sub>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	);
}
```

### 9.8 используй нативные модальные окна вместо js-реализаций

**влияние: высокое (нативная производительность, жесты, доступность)**

используй нативный `<Modal>` с `presentationStyle="formSheet"` или нативный form sheet из react navigation v7 вместо js-библиотек для нижних листов. нативные модальные окна имеют встроенные жесты, доступность и лучшую производительность. полагайся на нативный ui для низкоуровневых примитивов.

**❌ неправильно: js-нижний лист**

```jsx
import BottomSheet from "custom-js-bottom-sheet";

function MyScreen() {
	const sheetRef = useRef(null);

	return (
		<View style={{ flex: 1 }}>
			<Button onPress={() => sheetRef.current?.expand()} title="открыть" />
			<BottomSheet ref={sheetRef} snapPoints={["50%", "90%"]}>
				<View>
					<Text>контент листа</Text>
				</View>
			</BottomSheet>
		</View>
	);
}
```

**✅ правильно: нативный modal с formsheet**

```jsx
import { Modal, View, Text, Button } from "react-native";

function MyScreen() {
	const [visible, setVisible] = useState(false);

	return (
		<View style={{ flex: 1 }}>
			<Button onPress={() => setVisible(true)} title="открыть" />
			<Modal
				visible={visible}
				presentationStyle="formSheet"
				animationType="slide"
				onRequestClose={() => setVisible(false)}
			>
				<View>
					<Text>контент листа</Text>
				</View>
			</Modal>
		</View>
	);
}
```

**✅ правильно: react navigation v7 нативный form sheet**

```jsx
// в твоём навигаторе
<Stack.Screen
	name="Details"
	component={DetailsScreen}
	options={{
		presentation: "formSheet",
		sheetAllowedDetents: "fitToContents",
	}}
/>
```

нативные модальные окна дают свайп для закрытия, правильное избегание клавиатуры и доступность из коробки.

### 9.9 используй pressable вместо touchable компонентов

**влияние: низкое (современный api, более гибкий)**

никогда не используй `TouchableOpacity` или `TouchableHighlight`. вместо этого используй `Pressable` из `react-native` или `react-native-gesture-handler`.

**❌ неправильно: устаревшие touchable компоненты**

```jsx
import { TouchableOpacity } from "react-native";

function MyButton({ onPress }) {
	return (
		<TouchableOpacity onPress={onPress} activeOpacity={0.7}>
			<Text>нажми меня</Text>
		</TouchableOpacity>
	);
}
```

**✅ правильно: pressable**

```jsx
import { Pressable } from "react-native";

function MyButton({ onPress }) {
	return (
		<Pressable onPress={onPress}>
			<Text>нажми меня</Text>
		</Pressable>
	);
}
```

**✅ правильно: pressable из gesture handler для списков**

```jsx
import { Pressable } from "react-native-gesture-handler";

function ListItem({ onPress }) {
	return (
		<Pressable onPress={onPress}>
			<Text>элемент</Text>
		</Pressable>
	);
}
```

используй pressable из `react-native-gesture-handler` внутри прокручиваемых списков для лучшей координации жестов, при условии что ты также используешь scrollview из `react-native-gesture-handler`.

**для анимированных состояний нажатия (изменения scale, opacity):** используй `GestureDetector` с reanimated shared values вместо колбэка стилей pressable. смотри правило `animation-gesture-detector-press`.

---

## 10. дизайн-система

**влияние: среднее**

архитектурные паттерны для построения поддерживаемых библиотек компонентов.

### 10.1 используй составные компоненты вместо полиморфных children

**влияние: среднее (гибкая композиция, более понятный api)**

не создавай компоненты, которые могут принимать строку, если они не являются текстовым узлом. если компонент может получить строку как ребёнка, это должен быть отдельный компонент `*Text`. для таких компонентов, как кнопки, которые могут содержать и view (или pressable), и текст, используй составные компоненты, например `Button`, `ButtonText` и `ButtonIcon`.

**❌ неправильно: полиморфные children**

```jsx
import { Pressable, Text } from 'react-native'

function Button({ children, icon }) {
  return (
    <Pressable>
      {icon}
      {typeof children === 'string' ? <Text>{children}</Text> : children}
    </Pressable>
  )
}

// использование неоднозначно
<Button icon={<Icon />}>сохранить</Button>
<Button><CustomText>сохранить</CustomText></Button>
```

**✅ правильно: составные компоненты**

```jsx
import { Pressable, Text } from 'react-native'

function Button({ children }) {
  return <Pressable>{children}</Pressable>
}

function ButtonText({ children }) {
  return <Text>{children}</Text>
}

function ButtonIcon({ children }) {
  return <>{children}</>
}

// использование явное и компонуемое
<Button>
  <ButtonIcon><SaveIcon /></ButtonIcon>
  <ButtonText>сохранить</ButtonText>
</Button>

<Button>
  <ButtonText>отмена</ButtonText>
</Button>
```

---

## 11. монорепозиторий

**влияние: низкое**

управление зависимостями и конфигурация нативных модулей в монорепозиториях.

### 11.1 устанавливай нативные зависимости в директории приложения

**влияние: критичное (требуется для работы autolinking)**

в монорепозитории пакеты с нативным кодом должны быть установлены непосредственно в директории нативного приложения. autolinking сканирует только `node_modules` приложения — он не найдет нативные зависимости, установленные в других пакетах.

**❌ неправильно: нативная зависимость только в общем пакете**

```
packages/
  ui/
    package.json  # содержит react-native-reanimated
  app/
    package.json  # отсутствует react-native-reanimated
```

autolinking не срабатывает — нативный код не линкуется.

**✅ правильно: нативная зависимость в директории приложения**

```json
// packages/app/package.json
{
	"dependencies": {
		"react-native-reanimated": "3.16.1"
	}
}
```

даже если общий пакет использует нативную зависимость, приложение также должно указать её, чтобы autolinking обнаружил и слинковал нативный код.

### 11.2 используй единые версии зависимостей в монорепозитории

**влияние: среднее (избегает дублирующихся бандлов, конфликтов версий)**

используй единую версию каждой зависимости во всех пакетах монорепозитория. предпочитай точные версии, а не диапазоны. множественные версии вызывают дублирование кода в бандлах, конфликты в рантайме и неконсистентное поведение между пакетами.

используй инструмент вроде syncpack для контроля. как крайнее средство — используй yarn resolutions или npm overrides.

**❌ неправильно: диапазоны версий, множественные версии**

```json
// packages/app/package.json
{
  "dependencies": {
    "react-native-reanimated": "^3.0.0"
  }
}

// packages/ui/package.json
{
  "dependencies": {
    "react-native-reanimated": "^3.5.0"
  }
}
```

**✅ правильно: точные версии, единый источник правды**

```json
// package.json (корень)
{
  "pnpm": {
    "overrides": {
      "react-native-reanimated": "3.16.1"
    }
  }
}

// packages/app/package.json
{
  "dependencies": {
    "react-native-reanimated": "3.16.1"
  }
}

// packages/ui/package.json
{
  "dependencies": {
    "react-native-reanimated": "3.16.1"
  }
}
```

используй механизм override/resolution твоего пакетного менеджера для фиксации версий в корне. при добавлении зависимостей указывай точные версии без `^` или `~`.

---

## 12. сторонние зависимости

**влияние: низкое**

обёртки и реэкспорт сторонних зависимостей для поддержки.

### 12.1 импортируй из папки дизайн-системы

**влияние: низкое (позволяет глобальные изменения и лёгкий рефакторинг)**

реэкспортируй зависимости из папки дизайн-системы. код приложения импортирует оттуда, а не напрямую из пакетов. это позволяет глобальные изменения и лёгкий рефакторинг.

**❌ неправильно: импорт напрямую из пакета**

```jsx
import { View, Text } from "react-native";
import { Button } from "@ui/button";

function Profile() {
	return (
		<View>
			<Text>привет</Text>
			<Button>сохранить</Button>
		</View>
	);
}
```

**✅ правильно: импорт из дизайн-системы**

```jsx
import { View } from "@/components/view";
import { Text } from "@/components/text";
import { Button } from "@/components/button";

function Profile() {
	return (
		<View>
			<Text>привет</Text>
			<Button>сохранить</Button>
		</View>
	);
}
```

начни с простого реэкспорта. кастомизируй позже, без изменения кода приложения.

---

## 13. javascript

**влияние: низкое**

микро-оптимизации, такие как вынос создания дорогих объектов.

### 13.1 выноси создание intl formatter

**влияние: низкое–среднее (избегает дорогого пересоздания объектов)**

не создавай `Intl.DateTimeFormat`, `Intl.NumberFormat` или `Intl.RelativeTimeFormat` внутри рендера или циклов. их создание дорогое. выноси на уровень модуля, когда локаль/опции статичны.

**❌ неправильно: новый formatter при каждом рендере**

```jsx
function Price({ amount }) {
	const formatter = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	});
	return <Text>{formatter.format(amount)}</Text>;
}
```

**✅ правильно: вынесен на уровень модуля**

```jsx
const currencyFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

function Price({ amount }) {
	return <Text>{currencyFormatter.format(amount)}</Text>;
}
```

**для динамических локалей — мемоизируй:**

```jsx
const dateFormatter = useMemo(
	() => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }),
	[locale],
);
```

**частые formatter для выноса:**

```jsx
// formatter на уровне модуля
const dateFormatter = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" });
const timeFormatter = new Intl.DateTimeFormat("ru-RU", { timeStyle: "short" });
const percentFormatter = new Intl.NumberFormat("ru-RU", { style: "percent" });
const relativeFormatter = new Intl.RelativeTimeFormat("ru-RU", {
	numeric: "auto",
});
```

создание `Intl` объектов значительно дороже, чем `RegExp` или простых объектов — каждый раз парсится локаль и строятся внутренние таблицы поиска.

---

## 14. шрифты

**влияние: низкое**

нативная загрузка шрифтов для улучшенной производительности.

### 14.1 загружай шрифты нативно во время сборки

**влияние: низкое (шрифты доступны при запуске, без асинхронной загрузки)**

используй конфиг-плагин `expo-font`, чтобы встроить шрифты во время сборки вместо `useFonts` или `Font.loadAsync`. встроенные шрифты более эффективны.

**❌ неправильно: асинхронная загрузка шрифтов**

```jsx
import { useFonts } from "expo-font";
import { Text, View } from "react-native";

function App() {
	const [fontsLoaded] = useFonts({
		"Geist-Bold": require("./assets/fonts/Geist-Bold.otf"),
	});

	if (!fontsLoaded) {
		return null;
	}

	return (
		<View>
			<Text style={{ fontFamily: "Geist-Bold" }}>привет</Text>
		</View>
	);
}
```

**✅ правильно: конфиг-плагин, шрифты встроены в сборку**

```jsx
import { Text, View } from "react-native";

function App() {
	// состояние загрузки не нужно — шрифт уже доступен
	return (
		<View>
			<Text style={{ fontFamily: "Geist-Bold" }}>привет</Text>
		</View>
	);
}
```

после добавления шрифтов в конфиг-плагин выполни `npx expo prebuild` и пересобери нативное приложение.

---

## ссылки

1. [https://react.dev](https://react.dev)
2. [https://reactnative.dev](https://reactnative.dev)
3. [https://docs.swmansion.com/react-native-reanimated](https://docs.swmansion.com/react-native-reanimated)
4. [https://docs.swmansion.com/react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler)
5. [https://docs.expo.dev](https://docs.expo.dev)
6. [https://legendapp.com/open-source/legend-list](https://legendapp.com/open-source/legend-list)
7. [https://github.com/nandorojo/galeria](https://github.com/nandorojo/galeria)
8. [https://zeego.dev](https://zeego.dev)

{% endraw %}
