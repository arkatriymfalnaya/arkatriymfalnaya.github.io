---
title: паттерны композиции в react для агентов [перевод]
description:
keywords:
date: 2026-05-06
tags: ["computer_science", "javascript", "reactjs", "переводы"]
---

{% raw %}

вольный перевод статьи от Vercel Engineering "[React Composition Patterns v1.0.0](https://github.com/vercel-labs/agent-skills/blob/main/skills/composition-patterns/AGENTS.md)"

# паттерны композиции в react

**версия 1.0.0**  
январь 2026

> **примечание:**  
> этот документ в первую очередь для llm и агентов, которые поддерживают, генерируют или рефакторят react-код с использованием композиции. людям он тоже может быть полезен, но ориентирован на автоматизацию и единообразие.

---

## о чём речь

паттерны композиции для гибких и поддерживаемых react-компонентов. как не плодить булевы пропсы, используя составные компоненты, подъём состояния и композицию внутренностей. эти паттерны облегчают работу и людям, и ai-агентам по мере роста кодовой базы.

---

## 1. архитектура компонентов

**влияние: высокое**

фундаментальные паттерны для структурирования компонентов без разрастания пропсов.

### 1.1 не плоди булевы пропсы

**влияние: критичное (предотвращает появление неподдерживаемых вариантов компонента)**

не добавляй булевы пропсы типа `isThread`, `isEditing`, `isDMThread` для кастомизации поведения компонента. каждый новый булев пропс удваивает количество возможных состояний и создаёт не поддерживаемую со временем условную логику. вместо этого используй композицию.

**❌ неправильно: булевы пропсы создают экспоненциальную сложность**

```jsx
function Composer({
	onSubmit,
	isThread,
	channelId,
	isDMThread,
	dmId,
	isEditing,
	isForwarding,
}) {
	return (
		<form>
			<Header />
			<Input />
			{isDMThread ? (
				<AlsoSendToDMField id={dmId} />
			) : isThread ? (
				<AlsoSendToChannelField id={channelId} />
			) : null}
			{isEditing ? (
				<EditActions />
			) : isForwarding ? (
				<ForwardActions />
			) : (
				<DefaultActions />
			)}
			<Footer onSubmit={onSubmit} />
		</form>
	);
}
```

**✅ правильно: композиция убирает условные операторы**

```jsx
// обычный композер для канала
function ChannelComposer() {
	return (
		<Composer.Frame>
			<Composer.Header />
			<Composer.Input />
			<Composer.Footer>
				<Composer.Attachments />
				<Composer.Formatting />
				<Composer.Emojis />
				<Composer.Submit />
			</Composer.Footer>
		</Composer.Frame>
	);
}

// композер для треда — добавляет поле "также отправить в канал"
function ThreadComposer({ channelId }) {
	return (
		<Composer.Frame>
			<Composer.Header />
			<Composer.Input />
			<AlsoSendToChannelField id={channelId} />
			<Composer.Footer>
				<Composer.Formatting />
				<Composer.Emojis />
				<Composer.Submit />
			</Composer.Footer>
		</Composer.Frame>
	);
}

// композер для редактирования — другие кнопки в футере
function EditComposer() {
	return (
		<Composer.Frame>
			<Composer.Input />
			<Composer.Footer>
				<Composer.Formatting />
				<Composer.Emojis />
				<Composer.CancelEdit />
				<Composer.SaveEdit />
			</Composer.Footer>
		</Composer.Frame>
	);
}
```

каждый вариант явно показывает, что он рендерит. можно шарить внутренности без единого монолитного родителя.

### 1.2 используй составные компоненты (compound components)

**влияние: высокое (гибкая композиция без проброса пропсов)**

строй сложные компоненты как составные с общим контекстом. каждый подкомпонент получает доступ к общему состоянию через контекст, а не через пропсы. потребитель сам собирает нужные ему части.

**❌ неправильно: монолитный компонент с render-пропсами**

```jsx
function Composer({
	renderHeader,
	renderFooter,
	renderActions,
	showAttachments,
	showFormatting,
	showEmojis,
}) {
	return (
		<form>
			{renderHeader?.()}
			<Input />
			{showAttachments && <Attachments />}
			{renderFooter ? (
				renderFooter()
			) : (
				<Footer>
					{showFormatting && <Formatting />}
					{showEmojis && <Emojis />}
					{renderActions?.()}
				</Footer>
			)}
		</form>
	);
}
```

**✅ правильно: составные компоненты с общим контекстом**

```jsx
const ComposerContext = createContext(null);

function ComposerProvider({ children, state, actions, meta }) {
	return (
		<ComposerContext.Provider value={{ state, actions, meta }}>
			{children}
		</ComposerContext.Provider>
	);
}

function ComposerFrame({ children }) {
	return <form>{children}</form>;
}

function ComposerInput() {
	const {
		state,
		actions: { update },
		meta: { inputRef },
	} = use(ComposerContext);
	return (
		<TextInput
			ref={inputRef}
			value={state.input}
			onChangeText={(text) => update((s) => ({ ...s, input: text }))}
		/>
	);
}

function ComposerSubmit() {
	const {
		actions: { submit },
	} = use(ComposerContext);
	return <Button onPress={submit}>отправить</Button>;
}

// экспортируем как составной компонент
const Composer = {
	Provider: ComposerProvider,
	Frame: ComposerFrame,
	Input: ComposerInput,
	Submit: ComposerSubmit,
	Header: ComposerHeader,
	Footer: ComposerFooter,
	Attachments: ComposerAttachments,
	Formatting: ComposerFormatting,
	Emojis: ComposerEmojis,
};
```

**использование:**

```jsx
<Composer.Provider state={state} actions={actions} meta={meta}>
	<Composer.Frame>
		<Composer.Header />
		<Composer.Input />
		<Composer.Footer>
			<Composer.Formatting />
			<Composer.Submit />
		</Composer.Footer>
	</Composer.Frame>
</Composer.Provider>
```

потребитель сам собирает ровно то, что ему нужно. никаких скрытых условностей. состояние, действия и мета внедряются через dependency injection родительским провайдером, что позволяет использовать одну и ту же структуру компонента в разных местах.

---

## 2. управление состоянием

**влияние: среднее**

паттерны для подъёма состояния и организации общего контекста.

### 2.1 отделяй управление состоянием от ui

**влияние: среднее (позволяет менять реализацию состояния без изменения ui)**

провайдер должен быть единственным местом, которое знает, как управляется состояние. ui-компоненты потребляют интерфейс контекста — им не важно, пришло состояние из `useState`, zustand или синхронизации с сервером.

**❌ неправильно: ui привязан к реализации состояния**

```jsx
function ChannelComposer({ channelId }) {
	// ui-компонент знает о глобальной реализации состояния
	const state = useGlobalChannelState(channelId);
	const { submit, updateInput } = useChannelSync(channelId);

	return (
		<Composer.Frame>
			<Composer.Input
				value={state.input}
				onChange={(text) => updateInput(text)}
			/>
			<Composer.Submit onPress={() => submit()} />
		</Composer.Frame>
	);
}
```

**✅ правильно: управление состоянием изолировано в провайдере**

```jsx
// провайдер управляет всеми деталями состояния
function ChannelProvider({ channelId, children }) {
	const { state, update, submit } = useGlobalChannel(channelId);
	const inputRef = useRef(null);

	return (
		<Composer.Provider
			state={state}
			actions={{ update, submit }}
			meta={{ inputRef }}
		>
			{children}
		</Composer.Provider>
	);
}

// ui-компонент знает только об интерфейсе контекста
function ChannelComposer() {
	return (
		<Composer.Frame>
			<Composer.Header />
			<Composer.Input />
			<Composer.Footer>
				<Composer.Submit />
			</Composer.Footer>
		</Composer.Frame>
	);
}

// использование
function Channel({ channelId }) {
	return (
		<ChannelProvider channelId={channelId}>
			<ChannelComposer />
		</ChannelProvider>
	);
}
```

**разные провайдеры — один и тот же ui:**

```jsx
// локальное состояние для эфемерных форм
function ForwardMessageProvider({ children }) {
	const [state, setState] = useState(initialState);
	const forwardMessage = useForwardMessage();

	return (
		<Composer.Provider
			state={state}
			actions={{ update: setState, submit: forwardMessage }}
		>
			{children}
		</Composer.Provider>
	);
}

// глобальное синхронизированное состояние для каналов
function ChannelProvider({ channelId, children }) {
	const { state, update, submit } = useGlobalChannel(channelId);

	return (
		<Composer.Provider state={state} actions={{ update, submit }}>
			{children}
		</Composer.Provider>
	);
}
```

один и тот же `Composer.Input` работает с обоими провайдерами, потому что зависит только от интерфейса контекста, а не от реализации.

### 2.2 определяй generic-интерфейсы для dependency injection

**влияние: высокое (состояние, которое можно подставлять в разных сценариях)**

определи **generic-интерфейс** для контекста компонента из трёх частей: `state`, `actions` и `meta`. этот интерфейс — контракт, который может реализовать любой провайдер. одни и те же ui-компоненты работают с совершенно разными реализациями состояния.

**основной принцип:** поднимай состояние, компонуй внутренности, делай состояние подставляемым (dependency injection).

**❌ неправильно: ui привязан к конкретной реализации состояния**

```jsx
function ComposerInput() {
	// жёсткая привязка к конкретному хуку
	const { input, setInput } = useChannelComposerState();
	return <TextInput value={input} onChangeText={setInput} />;
}
```

**✅ правильно: generic-интерфейс позволяет dependency injection**

```jsx
// определяем ОБЩИЙ интерфейс, который может реализовать любой провайдер
interface ComposerState {
  input: string
  attachments: Attachment[]
  isSubmitting: boolean
}

interface ComposerActions {
  update: (updater: (state: ComposerState) => ComposerState) => void
  submit: () => void
}

interface ComposerMeta {
  inputRef: React.RefObject<TextInput>
}

interface ComposerContextValue {
  state: ComposerState
  actions: ComposerActions
  meta: ComposerMeta
}

const ComposerContext = createContext<ComposerContextValue | null>(null)
```

**ui-компоненты потребляют интерфейс, а не реализацию:**

```jsx
function ComposerInput() {
	const {
		state,
		actions: { update },
		meta,
	} = use(ComposerContext);

	// этот компонент работает с ЛЮБЫМ провайдером, реализующим интерфейс
	return (
		<TextInput
			ref={meta.inputRef}
			value={state.input}
			onChangeText={(text) => update((s) => ({ ...s, input: text }))}
		/>
	);
}
```

**разные провайдеры реализуют один интерфейс:**

```jsx
// провайдер A: локальное состояние для эфемерных форм
function ForwardMessageProvider({ children }) {
	const [state, setState] = useState(initialState);
	const inputRef = useRef(null);
	const submit = useForwardMessage();

	return (
		<ComposerContext.Provider
			value={{
				state,
				actions: { update: setState, submit },
				meta: { inputRef },
			}}
		>
			{children}
		</ComposerContext.Provider>
	);
}

// провайдер B: глобальное синхронизированное состояние для каналов
function ChannelProvider({ channelId, children }) {
	const { state, update, submit } = useGlobalChannel(channelId);
	const inputRef = useRef(null);

	return (
		<ComposerContext.Provider
			value={{
				state,
				actions: { update, submit },
				meta: { inputRef },
			}}
		>
			{children}
		</ComposerContext.Provider>
	);
}
```

**один и тот же составной ui работает с обоими:**

```jsx
// работает с ForwardMessageProvider (локальное состояние)
<ForwardMessageProvider>
  <Composer.Frame>
    <Composer.Input />
    <Composer.Submit />
  </Composer.Frame>
</ForwardMessageProvider>

// работает с ChannelProvider (глобальное синхронизированное состояние)
<ChannelProvider channelId="abc">
  <Composer.Frame>
    <Composer.Input />
    <Composer.Submit />
  </Composer.Frame>
</ChannelProvider>
```

**кастомный ui вне компонента может доступ к состоянию и действиям:**

```jsx
function ForwardMessageDialog() {
	return (
		<ForwardMessageProvider>
			<Dialog>
				{/* сам композер */}
				<Composer.Frame>
					<Composer.Input placeholder="можете добавить сообщение" />
					<Composer.Footer>
						<Composer.Formatting />
						<Composer.Emojis />
					</Composer.Footer>
				</Composer.Frame>

				{/* кастомный ui ВНЕ композера, но ВНУТРИ провайдера */}
				<MessagePreview />

				{/* кнопки внизу диалога */}
				<DialogActions>
					<CancelButton />
					<ForwardButton />
				</DialogActions>
			</Dialog>
		</ForwardMessageProvider>
	);
}

// эта кнопка живёт ВНЕ Composer.Frame, но всё равно может отправить форму!
function ForwardButton() {
	const {
		actions: { submit },
	} = use(ComposerContext);
	return <Button onPress={submit}>переслать</Button>;
}

// этот превью живёт ВНЕ Composer.Frame, но читает состояние композера!
function MessagePreview() {
	const { state } = use(ComposerContext);
	return <Preview message={state.input} attachments={state.attachments} />;
}
```

важна граница провайдера, а не визуальная вложенность. компонентам, которым нужно общее состояние, не обязательно находиться внутри `Composer.Frame`. им достаточно быть внутри провайдера.

`ForwardButton` и `MessagePreview` визуально не внутри блока композера, но всё равно могут достучаться до его состояния и действий. в этом и сила подъёма состояния в провайдеры.

ui — это переиспользуемые кусочки, которые ты компонуешь. состояние подставляется провайдером. меняешь провайдер — ui остаётся тем же.

### 2.3 поднимай состояние в провайдеры

**влияние: высокое (состояние становится доступным за пределами компонента)**

выноси управление состоянием в отдельные компоненты-провайдеры. это позволяет компонентам за пределами основного ui читать и менять состояние без проброса пропсов и неудобных ref-ов.

**❌ неправильно: состояние заперто внутри компонента**

```jsx
function ForwardMessageComposer() {
	const [state, setState] = useState(initialState);
	const forwardMessage = useForwardMessage();

	return (
		<Composer.Frame>
			<Composer.Input />
			<Composer.Footer />
		</Composer.Frame>
	);
}

// проблема: как эта кнопка получит доступ к состоянию композера?
function ForwardMessageDialog() {
	return (
		<Dialog>
			<ForwardMessageComposer />
			<MessagePreview /> {/* нужен доступ к состоянию композера */}
			<DialogActions>
				<CancelButton />
				<ForwardButton /> {/* нужно вызвать submit */}
			</DialogActions>
		</Dialog>
	);
}
```

**❌ неправильно: useEffect для синхронизации состояния**

```jsx
function ForwardMessageDialog() {
	const [input, setInput] = useState("");
	return (
		<Dialog>
			<ForwardMessageComposer onInputChange={setInput} />
			<MessagePreview input={input} />
		</Dialog>
	);
}

function ForwardMessageComposer({ onInputChange }) {
	const [state, setState] = useState(initialState);
	useEffect(() => {
		onInputChange(state.input); // синхронизация при каждом изменении 😬
	}, [state.input]);
}
```

**❌ неправильно: чтение состояния из ref при отправке**

```jsx
function ForwardMessageDialog() {
	const stateRef = useRef(null);
	return (
		<Dialog>
			<ForwardMessageComposer stateRef={stateRef} />
			<ForwardButton onPress={() => submit(stateRef.current)} />
		</Dialog>
	);
}
```

**✅ правильно: состояние поднято в провайдер**

```jsx
function ForwardMessageProvider({ children }) {
	const [state, setState] = useState(initialState);
	const forwardMessage = useForwardMessage();
	const inputRef = useRef(null);

	return (
		<Composer.Provider
			state={state}
			actions={{ update: setState, submit: forwardMessage }}
			meta={{ inputRef }}
		>
			{children}
		</Composer.Provider>
	);
}

function ForwardMessageDialog() {
	return (
		<ForwardMessageProvider>
			<Dialog>
				<ForwardMessageComposer />
				<MessagePreview />{" "}
				{/* кастомные компоненты могут читать состояние и действия */}
				<DialogActions>
					<CancelButton />
					<ForwardButton />{" "}
					{/* кастомные компоненты могут читать состояние и действия */}
				</DialogActions>
			</Dialog>
		</ForwardMessageProvider>
	);
}

function ForwardButton() {
	const { actions } = use(Composer.Context);
	return <Button onPress={actions.submit}>переслать</Button>;
}
```

`ForwardButton` живёт за пределами `Composer.Frame`, но всё ещё имеет доступ к действию `submit`, потому что находится внутри провайдера. даже будучи отдельным компонентом, он может достучаться до состояния и действий композера извне.

**главная мысль:** компонентам, которым нужно общее состояние, не обязательно быть визуально вложенными друг в друга — достаточно быть внутри одного провайдера.

---

## 3. паттерны реализации

**влияние: среднее**

конкретные техники для реализации составных компонентов и контекстных провайдеров.

### 3.1 создавай явные варианты компонентов

**влияние: среднее (самодокументируемый код, никаких скрытых условностей)**

вместо одного компонента с кучей булевых пропсов создавай явные компоненты-варианты. каждый вариант собирает из кусочков то, что ему нужно. код сам себя документирует.

**❌ неправильно: один компонент, много режимов**

```jsx
// что на самом деле рендерит этот компонент?
<Composer
	isThread
	isEditing={false}
	channelId="abc"
	showAttachments
	showFormatting={false}
/>
```

**✅ правильно: явные варианты**

```jsx
// сразу ясно, что рендерится
<ThreadComposer channelId="abc" />

// или
<EditMessageComposer messageId="xyz" />

// или
<ForwardMessageComposer messageId="123" />
```

каждая реализация уникальна, явна и самодостаточна. но они могут использовать общие части.

**реализация:**

```jsx
function ThreadComposer({ channelId }) {
	return (
		<ThreadProvider channelId={channelId}>
			<Composer.Frame>
				<Composer.Input />
				<AlsoSendToChannelField channelId={channelId} />
				<Composer.Footer>
					<Composer.Formatting />
					<Composer.Emojis />
					<Composer.Submit />
				</Composer.Footer>
			</Composer.Frame>
		</ThreadProvider>
	);
}

function EditMessageComposer({ messageId }) {
	return (
		<EditMessageProvider messageId={messageId}>
			<Composer.Frame>
				<Composer.Input />
				<Composer.Footer>
					<Composer.Formatting />
					<Composer.Emojis />
					<Composer.CancelEdit />
					<Composer.SaveEdit />
				</Composer.Footer>
			</Composer.Frame>
		</EditMessageProvider>
	);
}

function ForwardMessageComposer({ messageId }) {
	return (
		<ForwardMessageProvider messageId={messageId}>
			<Composer.Frame>
				<Composer.Input placeholder="можете добавить сообщение" />
				<Composer.Footer>
					<Composer.Formatting />
					<Composer.Emojis />
					<Composer.Mentions />
				</Composer.Footer>
			</Composer.Frame>
		</ForwardMessageProvider>
	);
}
```

каждый вариант явно показывает:

- какой провайдер/состояние используется
- какие ui-элементы включает
- какие действия доступны

никаких комбинаций булевых пропсов для анализа. никаких невозможных состояний.

### 3.2 предпочитай композицию через children вместо render-пропсов

**влияние: среднее (более чистая композиция, лучшая читаемость)**

используй `children` для композиции вместо пропсов с `renderX`. `children` читаются лучше, естественно компонуются и не требуют изучения сигнатур колбэков.

**❌ неправильно: render-пропсы**

```jsx
function Composer({ renderHeader, renderFooter, renderActions }) {
	return (
		<form>
			{renderHeader?.()}
			<Input />
			{renderFooter ? renderFooter() : <DefaultFooter />}
			{renderActions?.()}
		</form>
	);
}

// использование неудобное и неповоротливое
return (
	<Composer
		renderHeader={() => <CustomHeader />}
		renderFooter={() => (
			<>
				<Formatting />
				<Emojis />
			</>
		)}
		renderActions={() => <SubmitButton />}
	/>
);
```

**✅ правильно: составные компоненты с children**

```jsx
function ComposerFrame({ children }) {
	return <form>{children}</form>;
}

function ComposerFooter({ children }) {
	return <footer className="flex">{children}</footer>;
}

// использование гибкое
return (
	<Composer.Frame>
		<CustomHeader />
		<Composer.Input />
		<Composer.Footer>
			<Composer.Formatting />
			<Composer.Emojis />
			<SubmitButton />
		</Composer.Footer>
	</Composer.Frame>
);
```

**когда render-пропсы уместны:**

```jsx
// render-пропсы хороши, когда нужно передать данные обратно
<List
	data={items}
	renderItem={({ item, index }) => <Item item={item} index={index} />}
/>
```

используй render-пропсы, когда родитель должен предоставить дочернему компоненту данные или состояние. используй `children` при композиции статической структуры.

---

## 4. react 19 api

**влияние: среднее**

только для react 19+. не используй `forwardRef`; используй `use()` вместо `useContext()`.

### 4.1 изменения api в react 19

**влияние: среднее (более чистые определения компонентов и использование контекста)**

> **⚠️ только react 19+.** пропусти этот раздел, если используешь react 18 или ниже.

в react 19 `ref` стал обычным пропсом (обёртка `forwardRef` больше не нужна), а `use()` заменяет `useContext()`.

**❌ неправильно: forwardRef в react 19**

```jsx
const ComposerInput = forwardRef((props, ref) => {
	return <TextInput ref={ref} {...props} />;
});
```

**✅ правильно: ref как обычный проп**

```jsx
function ComposerInput({ ref, ...props }) {
	return <TextInput ref={ref} {...props} />;
}
```

**❌ неправильно: useContext в react 19**

```jsx
const value = useContext(MyContext);
```

**✅ правильно: use вместо useContext**

```jsx
const value = use(MyContext);
```

`use()` можно вызывать условно, в отличие от `useContext()`.

---

## ссылки

1. [https://react.dev](https://react.dev)
2. [https://react.dev/learn/passing-data-deeply-with-context](https://react.dev/learn/passing-data-deeply-with-context)
3. [https://react.dev/reference/react/use](https://react.dev/reference/react/use)

{% endraw %}
