---
title: как работает blink [перевод]
description:
date: 2022-06-24
tags: ["computer_science", "browsers", "переводы"]
---

Вольный перевод статьи haraken@ "[How Blink works](https://docs.google.com/document/d/1aitSOucL0VHZa9Z2vbRJSyAIsAz24kX8LFByQ5xQnUg/edit#)"

# Как работает Blink

Новым разработчикам не так просто начать работать с Blink, поскольку существует множество специфичных для него концепций и соглашений, которые были введены для реализации очень быстрого рендер-движка. Порой даже опытным Blink разработчикам бывает непросто, поскольку Blink огромен и чрезвычайно чувствителен к производительности, памяти и безопасности.

Этот документ нацелен предоставить **обзор самой основной информации о том, как работает Blink**, Надеюсь, он поможет разработчикам познакомиться с архитектурой быстро:

- Документ НЕ является подробным руководством по архитектурам и правилам Blink (которые, к тому же, могут меняться и устаревать). Документ, скорее, кратко описывает основы движка, которые вряд ли изменятся в ближайшее время и указывает на ресурсы, где вы сможете найти дополнительную информацию.
- Документ НЕ поясняет специфичные возможности (вроде ServiceWorkers и пр. ). Скорее, поясняет основные возможности, используемые основной кодовой базой (вроде управления памятью и APIшками V8).

Для более детальной информации о разработке Blink, смотрите [Chromium wiki page](https://www.chromium.org/blink).

# Что умеет Blink

[Blink](https://www.chromium.org/blink) - это рендерный движок веб платформы. Грубо говоря, Blink внедряет весь функционал, который отрисовывает контент во вкладке браузера:

- Внедряет спецификации веб платформ (вроде [HTML standard](https://html.spec.whatwg.org/multipage/?)), включая DOM, CSS и Web IDL
- Встраивает V8 и запускает JavaScript
- Запрашивает ресурсы, лежащие в основе сетевого стэка
- Строит DOM деревья
- Вычисляет стили и разметку
- Встраивает [Chrome Compositor](https://chromium.googlesource.com/chromium/src/+/HEAD/cc/README.md) и отрисовывает графику

Blink внедрен многими клиентами, вроде Chromium, Android WebView и Opera с помощью [content public APIs](https://chromium.googlesource.com/chromium/src/+/HEAD/content/public/README.md).

![Alt Text](https://dev-to-uploads.s3.amazonaws.com/i/0dnvwe3d0oxgl821457x.png)

С точки зрения кодовой базы, "Blink" обычно означает //third_party/blink/. С точки зрения проекта - реализующие возможности веб платформы проекты. Код, который внедряет возможности веб платформы, охватывает //third_party/blink/, //content/renderer/, //content/browser/ и другие места.

# Архитектура процессов / потоков

## Процессы

Chromium имеет [мультипроцессорную архитектуру](https://www.chromium.org/developers/design-documents/multi-process-architecture), имеет один браузерный процесс и N-е количество процессов рендеринга в песочнице. Blink запускается в процессе рендеринга.

Как много процессов рендеринга создается? В целях безопасности очень важно изолировать области адресов памяти между кросссайтовыми документами (это называется [Site Isolation](https://www.chromium.org/Home/chromium-security/site-isolation)). Концептуально, каждый рендер процесс должен принадлежать максимум одному сайту. В реальности же, иногда слишком тяжело ограничивать процесс рендеринга сайта, если пользователь открывает слишком много вкладок или устройство не имеет достаточное количество RAM. Тогда процесс рендеринга может быть разделен между несколькими фреймами или вкладками, загруженными с разных. Это означает, что фреймы из одной вкладки могут храниться разными рендер процессами, а фреймы разных вкладок - в одном. **Между процессами рендерера, фреймов и вкладок нет никакого соотношения** .

Учитывая, что процесс рендеринга запускается в песочнице, Blink`у необходимо запросить у браузера разрешение на отправку системных вызовов (вроде доступа к файловой системе или проигрышу аудио) и получение доступа к данным профиля пользователя (вроде кук и паролей). Этот процесс реализован [Mojo](https://chromium.googlesource.com/chromium/src/+/master/mojo/README.md). (Примечание: раньше мы использовали [Chromium IPC](https://www.chromium.org/developers/design-documents/inter-process-communication), который все еще используется в некоторых местах. Однако, он считается устаревшим, и использует Mojo под капотом.). На стороне Chromium, [обслуживание](https://www.chromium.org/servicification) продолжается и абстрагирует процесс браузера как набор сервисов. С точки зрения Blink, для взаимодействия с сервисами и процессом браузера может использоваться только Mojo.

![Alt Text](https://dev-to-uploads.s3.amazonaws.com/i/1lvhg7q6kventpojmef0.png)

Если нужны подробности:

- [Multi-process Architecture](https://www.chromium.org/developers/design-documents/multi-process-architecture)
- Mojo programming in Blink: platform/mojo/MojoProgrammingInBlink.md

## Потоки

Как можно потоков создается в процессе рендеринга?

Blink имеет один основной поток, N-е количество воркер потоков (worker threads) и пару внутренних потоков.

Почти все главные вещи происходят в основном потоке. Весь JavaScript (кроме воркеров), DOM, CSS, стили и разметка вычисляются в основном потоке. Blink высокооптимизирован для максимализации производительности основного потока, в основном предполагая однопоточную архитектуру.

Blink может создавать несколько воркер потоков для запуска [Web Workers](https://html.spec.whatwg.org/multipage/workers.html#workers), [ServiceWorker](https://w3c.github.io/ServiceWorker/) и [Worklets](https://www.w3.org/TR/worklets-1/).

Blink и V8 могут создавать несколько внутренних потоков для обработки webaudio, database, GC и прочего.

Для кросс-поточного взаимодействия, вам придется передавать сообщения с помощью APIшек PostTask. Программирование с общедоступной памятью не рекомендуется, за исключением парочки мест, где это необходимо для производительности. Потому вы не увидите кучи MutexLocks концептов в кодовой базе Blink.

![Alt Text](https://dev-to-uploads.s3.amazonaws.com/i/ai29axs1dz8sbojo76m6.png)

Если нужны подробности:

- Thread programming in Blink: platform/wtf/ThreadProgrammingInBlink.md
- Workers: [core/workers/README.md](https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/renderer/core/workers/README.md)

## Инициализация & завершение Blink

Blink инициализируется с помощью [BlinkInitializer::Initialize()](https://cs.chromium.org/chromium/src/third_party/blink/renderer/controller/blink_initializer.cc?sq=package:chromium&dr=C&g=0&l=86). Этот метод должен быть вызван перед испольнением любого Blink кода.

С другой стороны, Blink никогда не завершает свою работу; т.е., процесс рендеринга принудительно завершается без очистки. Одна из причин в производительности, другая - обычно каким-то изящно упорядоченным способом очень тяжело подчистить всё, что остается после процесса рендерера (и усилий оно не стоит).

# Структура директории

## Content public API и Blink public API

[Content public API](https://cs.chromium.org/chromium/src/content/public/) - это слой API, который позволяет встраивать движок рендеринга. Для успешного внедрения, Content public API должны очень осторожно поддерживаться.

[Blink public API](https://cs.chromium.org/chromium/src/third_party/blink/public/?q=blink/public&sq=package:chromium&dr) - это слой API, который указывает Chromium на возможности //third_party/blink/. Этот слой является простым историческим артефактом, унаследованным от WebKit. Во времена WebKit, Chromium и Safari делились реализацией WebKit, потому слой API должен был указывать возможности обоим. И, поскольку теперь только Chromium внедряет //third_party/blink/, слой API больше не имеет смысла. Мы активно уменьшаем количество # в Blink`s public APIs, перенося код веб платформы с Chromium (проект называется Onion Soup).

![Alt Text](https://dev-to-uploads.s3.amazonaws.com/i/tukfzrblwutjtl02sfmc.png)

## Структура директории и зависимости

[//third_party/blink/](//third_party/blink/) имеет следующие директории. Для более детальной информации по ним смотрите [этот документ](https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/renderer/README.md):

- platform/
  - Коллекция низкоуровневых возможностей Blink, которые были вынесены из монолитного ядра/. вроде геометрии и графических утилит.
- core/ и modules/
  - Внедрения всех возможностей веб платформы, определенных в спецификациях. core/ внедряет возможности, тесно связанные с DOM. modules/ внедряет более автономные, вроде webaudio и indexeddb.
- bindings/core/ и bindings/modules/
  - Концептуально, bindings/core/ является частью core/, а bindings/modules/ - modules/. Файлы, интенсивно использующие V8 API, находятся в директории bindings/{core,modules}.
- controller/
  - Набор высокоуровневых библиотек, использующих core/ и modules/. вроде devtools front-end.

Поток зависимостей идет в следующем порядке:

- Chromium => controller/ => modules/ и bindings/modules/ => core/ и bindings/core/ => platform/ => низкоуровневые примитивы, вроде //base, //v8 и //cc

Blink осторожно поддерживает список низкоуровневых примитивов, указанных для //third_party/blink/.

Если нужны подробности:

- Directory structure and dependencies: [blink/renderer/README.md](https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/renderer/README.md)

## WTF

WTF - это "Blink-специфичная базовая" библиотека. Находится в platform/wtf/. Мы пытаемся максимально унифицировать примитивы между Chromium и Blink, поэтому WTF должна быть маленькой. Она существует, потому что есть количество типов, контейнеров и макросов, которые должны быть оптимизированы для нагрузки Blink и Oilpan (Blink GC). Если типы определяются в библиотеке WTF, Blink`у приходится использовать их вместо тех, которые были определены в //base или std библиотеках. Самые популярные - это vectors, hashsets, hashmaps и strings. Blink должен использовать WTF::Vector, WTF::HashSet, WTF::HashMap, WTF::String и WTF::AtomicString вместо std::vector, std::*set, std::*map и std::string.

Если нужны подробности:

- How to use WTF: [platform/wtf/README.md](https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/renderer/platform/wtf/README.md)

# Управление памятью

Что касается Blink, вам нужно заботиться о трех распределителях памяти:

- [PartitionAlloc](https://chromium.googlesource.com/chromium/src/+/master/base/allocator/partition_allocator/PartitionAlloc.md)
- [Oilpan](https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/renderer/platform/heap/BlinkGCAPIReference.md) (a.k.a. Blink GC)
- malloc/free или new/delete (запрещен)

Вы можете выделить объект в PartitionAlloc куче с помощью USING_FAST_MALLOC():

    class SomeObject {
      USING_FAST_MALLOC(SomeObject);
      static std::unique_ptr<SomeObject> Create() {
        return std::make_unique<SomeObject>();  // Выделено в PartitionAlloc куче.
      }
    };

Жизненный период выделенных PartitionAlloc объектов должен управляться scoped_refptr<> или std::unique_ptr<>. Строго не рекомендуется управлять им вручную. Ручное удаление в Blink запрещено.

Вы можете выделить объект в Oilpan куче с помощью GarbageCollected:

    class SomeObject : public GarbageCollected<SomeObject> {
      static SomeObject* Create() {
        return new SomeObject;  // Выделено в Oilpan куче.
      }
    };

Жизненный период выделенных Oilpan объектов управляется сборщиком мусора автоматически. Для хранения объектов в Oilpan куче вам нужно использовать специальные указатели, вроде Member<>, Persistent<>. Программные ограничения Oilpan описаны в See [API reference](https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/renderer/platform/heap/BlinkGCAPIReference.md). Самым главным из них является то, что непозволительно трогать любой другой Oilpan объект в его деструкторе (потому что порядок уничтожения не гарантируется).

Если вы не используете ни USING_FAST_MALLOC(), ни GarbageCollected, объекты будут выделены в системной malloc куче. Этого делать строго не рекомендуется. Все Blink объекты должны быть выделены с помощью PartitionAlloc или Oilpan, как описано ниже:

- Используйте Oilpan по умолчанию.
- Используйте PartitionAlloc тогда, когда 1) жизненный период объекта чист и использования std::unique_ptr<> или scoped_refptr<> достаточно, 2) выделение объекта с помощью Oilpan подразумевает сложности, 3) выделение объекта с помощью Oilpan без необходимости воздействует на рантайм сборки мусора.

Несмотря на то, используете вы PartitionAlloc или Oilpan, вам стоит быть очень осторожными, чтобы не создавать висячие указатели (Примечание: raw указатели строго не рекомендуются) или утечки памяти.

Если нужны подробности:

- How to use PartitionAlloc: [platform/wtf/allocator/Allocator.md](https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/renderer/platform/wtf/allocator/Allocator.md)
- How to use Oilpan: [platform/heap/BlinkGCAPIReference.md](https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/renderer/platform/heap/BlinkGCAPIReference.md)
- Oilpan GC design: [platform/heap/BlinkGCDesign.md](https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/renderer/platform/heap/BlinkGCDesign.md)

# Планирование задач

Чтобы улучшить отзывчивость движка рендеринга, задачи в Blink должны выполняться асинхронно в то время, когда возможно. Синхронные IPC / Mojo и любые другие операции, которые могут занимать несколько миллисекунд, не рекомендуются (хоть некоторые и неизбежны, вроде выполнения пользовательского JavaScript).

Все задачи в процессе рендерера должны быть опубликованы в [Blink Scheduler](https://chromium.googlesource.com/chromium/src/+/lkcr/third_party/WebKit/Source/platform/scheduler/README.md) с правильными типами, вот так:

    // Опубликовать задачу с типом kNetworking для планировщика фрейма
    frame->GetTaskRunner(TaskType::kNetworking)->PostTask(..., WTF::Bind(&Function));

Blink Scheduler поддерживает очереди задач и разумно выставляет приоритеты, чтобы максимализировать воспринимаемую пользователем производительность. Для этого важно определять [типы задач правильно](https://cs.chromium.org/chromium/src/third_party/blink/public/platform/task_type.h?q=blink+tasktype&sq=package:chromium&dr=CSs&l=5).

Если нужны подробности:

- How to post tasks: platform/scheduler/PostTask.md

# Page, Frame, Document, DOMWindow и прочее

## Концепции

Page, Frame, Document, ExecutionContext и DOMWindow являются:

- Page соответствует концепции вкладки (если OOPIF, который будет объяснен позже, не включен). Каждый процесс рендерера может содержать несколько вкладок.
- Frame соответствует концепции фрейма (главный фрейм или iframe). Каждая вкладка (Page) может содержать один или более Frame`ов, представленных в древовидной иерархии.
- DOMWindow соответствует объекту object в JavaScript. Каждый Frame имеет один DOMWindow.
- Document соответствуте объекту window.document в JavaScript. Каждый Frame имеет один Document.
- ExecutionContext является концепцией, которая абстрагирует Document (для основного потока) и WorkerGlobalScope (для воркер потока).

Процесс рендеринга относится к Page, как 1 : N.

Page относится к Frame, как 1 : M.

Frame относится к DOMWindow и к Document (или ExecutionContext), как 1 : 1 : 1 в любой момент времени, но со временем отображение может меняться. Например, рассмотрите такой код:

    iframe.contentWindow.location.href = "https://example.com";

В этом случае, для [https://example.com](https://example.com/) создаются новые DOMWindow и Document. Однако, Frame может быть переиспользован.

(Примечание: кроме случаев, когда создается только один новый Document, а DOMWindow и the Frame могут переиспользоваться, есть и [еще более сложные](https://docs.google.com/presentation/d/1pHjF3TNCX--j0ss3SK09pXlVOFK0Cdq6HkMcOzcov1o/edit#slide=id.g4983c55b2d55fcc7_42).)

Если нужны подробности:

- core/frame/FrameLifecycle.md

## Внепроцессорные iframe`ы (Out-of-Process iframes)

[Site Isolation](https://www.chromium.org/developers/design-documents/site-isolation) хоть и добавляет безопасности, но делает некоторые вещи еще более сложными. :) Идея Site Isolation в том, чтобы создавать один процесс рендеринга на сайт. (под _сайтом_ подразумевается регистрируемый домен страницы + 1 метка, и его URL схема. Например, [https://mail.example.com](https://mail.example.com/) и [https://chat.example.com](https://chat.example.com/) - один сайт, а [https://noodles.com](https://noodles.com/) и [https://pumpkins.com](https://pumpkins.com/) - нет.) Если Page содержит один кроссайтовый iframe, то может обрабатываться двумя процессами. Рассмотрим следующий код:

    <!-- https://example.com -->
    <body>
    <iframe src="https://example2.com"></iframe>
    </body>

Главный фрейм и iframe могут обрабатываться разными рендер процессами. Локальный фрейм представляется в виде LocalFrame, нелокальный - в виде RemoteFrame.

С точки зрения главного фрейма, он сам является LocalFrame, а встроенный iframe является RemoteFrame. С точки зрения iframe все наоборот.

Взаимодействие между LocalFrame и RemoteFrame (которые, напомню, могут обрабатываться в разных процессах) обрабатывается с помощью браузерного процесса.

Если нужны подробности:

- Design docs: [Site isolation design docs](https://www.chromium.org/developers/design-documents/site-isolation)
- How to write code with site isolation: core/frame/SiteIsolation.md

## Обособленный Frame / Document

Frame / Document могут быть в отдельных состояниях. Посмотрим на следующий код:

    doc = iframe.contentDocument;
    iframe.remove();  // iframe отделен от DOM дерева.
    doc.createElement("div");  // но скрипты все еще доступны.

Хитрый факт в том, что вы все еще можете запускать скрипты или проводить операции над DOM в отдельных фреймах. Поскольку фрейм уже был отделен, большинство DOM операций обвалятся и выбросят ошибки. К несчастью, поведения обособленных фреймов не совсем совместимы с браузерами и плохо описаны в спецификациях. Чаще всего стоит ожидать, что JavaScript продолжит выполняться, но большинство DOM операций упадёт с исключениями:

    void someDOMOperation(...) {
      if (!script_state_->ContextIsValid()) { // Фрейм уже отделен
        …;  // Определите исключения и пр.
        return;
      }
    }

Это значит, что в большинстве случаев Blink`у необходимо проводить некоторые очистки, если фреймы отделяются. Наследуясь от [ContextLifecycleObserver](https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/context_lifecycle_observer.h?type=cs&q=contextlifecycleobserver&sq=package:chromium&g=0&l=95), это можно делать следующим образом:

    class SomeObject : public GarbageCollected<SomeObject>, public ContextLifecycleObserver {
      void ContextDestroyed() override {
        // Здесь операции по очистке.
      }
      ~SomeObject() {
        // Операции по очистке проводить здесь плохая идея, поскольку уже поздно. Также деструктор не позволяет прикасаться к объектам на Oilpan куче.
      }
    };

# Web IDL bindings

Когда запрашивает JavaScript node.firstChild, вызывается Node::firstChild() в node.h. Как это работает? Давайте взглянем.

В первую очередь, нам нужно определить IDL файл согласно спецификации:

    // node.idl
    interface Node : EventTarget {
      [...] readonly attribute Node? firstChild;
    };

Синтаксис Web IDL определяется в [Web IDL спецификации](https://heycam.github.io/webidl/). Конструкция [...] называется расширенными IDL атрибутами. Некоторые из них определяются в Web IDL спецификации, а некоторые - в [Blink-specific IDL extended attributes](https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/renderer/bindings/IDLExtendedAttributes.md). Все IDL файлы, кроме специфичных для Blink, должны быть написаны в соответствии со спецификацией (т.е., просто скопированы оттуда).

Во-вторых, вам нужно определить C++ класс для Node и внедрить C++ геттер для firstChild:

    class EventTarget : public ScriptWrappable {  // Все классы, назначенные для JavaScript, должны наследоваться от ScriptWrappable.
      ...;
    };

    class Node : public EventTarget {
      DEFINE_WRAPPERTYPEINFO();  // Все классы должны иметь этот макрос.
      Node* firstChild() const { return first_child_; }
    };

В большинстве случаев, этого хватит. Когда вы собираете node.idl, [IDL компилятор](https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/renderer/bindings/IDLCompiler.md) автоматически генерирует биндинги Blink-V8 для интерфейсов Node и Node.firstChild. Генерируются они в [//src/out/{Debug,Release}/gen/third_party/ blink/renderer/bindings/core/v8/v8_node.h](https://cs.chromium.org/chromium/src/out/Debug/gen/third_party/blink/renderer/bindings/core/v8/v8_node.h?q=v8node&sq=package:chromium&dr=CSs&l=11). Когда JavaScript вызывает node.firstChild, V8 вызывает V8Node::firstChildAttributeGetterCallback() в v8_node.h, после чего вызывается Node::firstChild(), который мы определили в примере выше.

Если нужны подробности:

- How to add Web IDL bindings: [bindings/IDLCompiler.md](https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/renderer/bindings/IDLCompiler.md)
- How to use IDL extended attributes: [bindings/IDLExtendedAttributes.md](https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/renderer/bindings/IDLExtendedAttributes.md)
- Spec: [Web IDL spec](https://heycam.github.io/webidl/)

# V8 и Blink

## Isolate, Context, World

Важно понимать концепты Isolate (Изоляция), Context (Контекст) и World (Мир), если вы пишете код, который затрагивает V8 API. Они представлены через v8::Isolate, v8::Context и DOMWrapperWorld в кодовой базе.

Isolate соответствует физическому потоку. Isolate относится к физическому потоку в Blink, как = 1 : 1. Как основной, так и воркер поток имеют свою собственную Isolate.

Context соответствует глобальному объекту (в случае с Frame - это объект window). Поскольку каждый фрейм имеет свой собственный объект window, в процессе рендеринга создается несколько контекстов. Потому, когда вы вызываете V8 API, необходимо убедиться, что вы находитесь в правильном. Иначе v8::Isolate::GetCurrentContext() вернет неправильный контекст и, в худшем случае, произойдет утечка объектов с последующими ошибки безопасности.

World - это концепция для поддержки контентных скриптов расширений Chrome. Миры не соответствуют никакому из веб-стандартов. Контентные скрипты "хотят" делиться DOM дерево с веб страницей, но, из соображений безопасности, эти JavaScript объекты должны быть изолированы из кучи. А еще, куча одного контентного скрипта должна быть изолирована от кучи другого. Чтобы реализовать изоляцию, основной поток создает один главный world для страницы и по одному изолированному world для каждого контентного скрипта, которые имею доступ к одним C++ DOM объектам, но их JavaScript объекты изолированы. Эта изоляция реализуется путем создания нескольких V8 оберток для каждого C++ DOM объекта; т.е., одна обертка на World.

![Alt Text](https://dev-to-uploads.s3.amazonaws.com/i/miwaf3r2d1eu9scvpey2.png)

Какие отношения между Context, World и Frame?

Представьте, что в основном потоке есть N-е количество миров (один главный + (N - 1) изолированных). Тогда один Frame должен иметь N-е количество объектов window, каждый из которых использует по одному world. Context - это концепция, соответствующая объекту window. Раз у нас есть M-е количество Frame и N-е количество World, то M \* N количество Context (но контексты создаются лениво).

В случае с воркером, создается только один World и один глобальный объект, потому и Context только один.

Повторюсь. Когда вы используете V8 APIшки, будьте очень внимательны насчет правильного контекста. Иначе допустите утечки объектов между изолированными мирами и вызовете катастрофу с безопасностью (например, расширение с сайта A.com сможет управлять расширением с сайта B.com).

Если нужны подробности:

- [bindings/core/v8/V8BindingDesign.md](https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/renderer/bindings/core/v8/V8BindingDesign.md)

## V8 APIшки

Множество V8 APIшек, определенных в [//v8/include/v8.h](https://cs.chromium.org/chromium/src/v8/include/v8.h?q=v8.h&sq=package:chromium&dr=CSs&l=10), являются низкоуровневыми, потому их тяжело использовать правильным образом. [platform/bindings/](https://cs.chromium.org/chromium/src/third_party/blink/renderer/platform/bindings/?q=platform/bindings&sq=package:chromium&dr) предоставляет несколько хелперов, которые оборачивают их. Рассмотрите возможность использования хелперов максимально часто. Если ваш код интенсивно использует V8 API, файлы должны лежать в bindings/{core,modules}.

Для указания на объекты V8 используются хендлеры. Самый частый из них - это v8::Local<>, который используется для указания объектов из машинного стэка. v8::Local<> должен использоваться после выделения v8::HandleScope, и не должен использоваться вне машинного стэка:

    void function() {
      v8::HandleScope scope;
      v8::Local<v8::Object> object = ...;  // Верно.
    }

    class SomeObject : public GarbageCollected<SomeObject> {
      v8::Local<v8::Object> object_;  // Неверно.
    };

В противном случае, вам придется использовать [wrapper tracing](https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/renderer/platform/bindings/TraceWrapperReference.md). Однако, стоит быть очень осторожными, чтобы не создать с его помощью ссылочный цикл. В целом, V8 API тяжело использовать. Задавайте свои вопросы на почту [blink-review-bindings@](https://groups.google.com/a/chromium.org/forum/#!forum/blink-reviews-bindings), если не уверены.

Если нужны подробности:

- How to use V8 APIs and helper classes: platform/bindings/HowToUseV8FromBlink.md

## V8 обёртки

Каждый C++ DOM объект, вроде Node, имеет соответствующую V8 обёртку. Говоря точнее, каждый C++ DOM объект имеет только одну V8 обёртку на один World.

Оболочки V8 имеют строгие ссылки на соответствующие им объекты C ++ DOM. Однако объекты C ++ DOM имеют только слабые ссылки на оболочки V8. Поэтому, если вы хотите, чтобы обертки V8 оставались не убивались определенный период времени, стоит сделать это явно. В противном случае оболочки V8 будут преждевременно собраны, а свойства JS на оболочках V8 будут потеряны ...

    div = document.getElementbyId("div");
    child = div.firstChild;
    child.foo = "bar";
    child = null;
    gc();  // Если ничего не сделать, V8 оберка |firstChild| будет удалена сборщиком мусора.
    assert(div.firstChild.foo === "bar");  //...и тест упадет.

Если ничего не делать, _child_ будет удален сборщиком мусора, а _child.foo_ потеряется. Чтобы сохранить обертку div.firstChild, нужно внедрить механизм, который будет "поддерживать обертку div.firstChild живой до тех пор, пока DOM дерево, которому принадлежит div, будет доступно для V8".

Чтобы хранить V8 обертки живыми, есть два способа: [ActiveScriptWrappable](https://cs.chromium.org/chromium/src/third_party/blink/renderer/bindings/core/v8/active_script_wrappable.h?q=activescriptwrappable&sq=package:chromium&dr=CSs&l=16) и [wrapper tracing](https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/renderer/platform/bindings/TraceWrapperReference.md).

Если нужны подробности:

- How to manage lifetime of V8 wrappers: bindings/core/v8/V8Wrapper.md
- How to use wrapper tracing: [platform/bindings/TraceWrapperReference.md](https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/renderer/platform/bindings/TraceWrapperReference.md)

# Конвейер рендеринга

Большой путь проделывается между тем, как HTML файл доставляется движку и пиксели начинают отображаться на экране. Конвейер рендеринга построен следующим образом:

![Alt Text](https://dev-to-uploads.s3.amazonaws.com/i/atgdhgvbfnrmvild7efr.png)

[В этой презентации](https://docs.google.com/presentation/d/1boPxbgNrTU0ddsc144rcXayGA_WF53k96imRH8Mp34Y/edit#slide=id.p) описана каждая фаза конвейера, и я не думаю, что смогу описать лучше :-)

- Overview: [Life of a pixel](https://docs.google.com/presentation/d/1boPxbgNrTU0ddsc144rcXayGA_WF53k96imRH8Mp34Y/edit#slide=id.p)
- DOM: [core/dom/README.md](https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/renderer/core/dom/README.md)
- Style: [core/css/README.md](https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/renderer/core/css/README.md)
- Layout: [core/layout/README.md](https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/renderer/core/layout/README.md)
- Paint: [core/paint/README.md](https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/renderer/core/paint/README.md)
- Compositor thread: [Chromium graphics](https://www.chromium.org/developers/design-documents/chromium-graphics)

# Вопросы?

Вы можете присылать все свои вопросы на почту [blink-dev@chromium.org](https://groups.google.com/a/chromium.org/forum/#!forum/blink-dev) (для общих вопросов) или [platform-architecture-dev@chromium.org](https://groups.google.com/a/chromium.org/forum/#!forum/platform-architecture-dev) (для вопросов, связанных с архитектурой). Мы всегда рады помочь! :D
