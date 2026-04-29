---
title: javascripts design patterns
description:
keywords: javascript frontend
date: 2024-02-24
tags: ["computer_science", "javascripts", "architecture", "conspects"]
---

### Creational design patterns

These patterns are used to provide a mechanism for creating objects in a specific situation without revealing the creation method. The normal approach for creating an object might lead to complexities in the design of a project. These patterns allow flexibility in deciding which objects need to be created for a specific use case by providing control over the creation process.

Creational design patterns: Constructor, Factory, Abstract, Prototype, Singleton, Builder.

---

#### Constructor

The “constructor pattern”, as the name defines, is a _class-based_ pattern that uses the _constructors_ present in the class to create specific types of objects.

There are many ways to create objects in JavaScript, such as using the `{}` notation or using `Object.create`.

##### When to use the constructor pattern?

You can use it when you want to create multiple instances of the same template, since the instances can share methods but can still be different. Some examples of where it can be useful include:

- libraries
- plugins

---

#### Factory

The _factory pattern_ is a creational pattern that provides a template that can be used to create objects. It is used in complex situations where the type of the object required varies and needs to be specified in each case.

It does not use the `new` keyword directly to instantiate objects. This means it does not explicitly require the use of a constructor to create objects. Instead, it provides a generic interface that delegates the object creation responsibility to the corresponding subclass.

##### When to use the factory pattern?

- When the type of objects required cannot be anticipated beforehand
- When multiple objects that share similar characteristics need to be created
- When you want to generalize the object instantiation process since the object set up is complex in nature

---

#### Abstract

To understand the abstract pattern, let’s go back to the factory pattern. We use the factory pattern to create multiple objects from the same family without having to deal with the creation process. The abstract pattern is similar; the difference is that it provides a constructor to create families of related objects. It is abstract, meaning it does not specify concrete classes or constructors.

##### When to use the abstract pattern?

The abstract pattern for creating instances is preferred over initializing when using the `new` operator since constructors have limited control over the process. Whereas, a factory (pattern?) will have broader knowledge.

The use cases for this pattern are:

- applications requiring the reuse or sharing of objects
- applications with complex logic because they have multiple families of related objects that need to be used together
- object caching
- when the object creation process is to be shielded from the client

---

#### Prototype

The **prototype creational pattern** is used to instantiate objects with some default values using an existing object. It clones the object and provides the existing properties to the cloned object using prototypal inheritance.

In prototypal inheritance, a prototype object acts as a blueprint from which other objects inherit when the constructor instantiates them. Hence, any properties defined on the prototype of a constructor function will also be present in the cloned object it creates.

##### When to use the prototype pattern?

The prototypal pattern has native support in JavaScript via `.prototype`. It involves cloning an already-configured object. Hence, the cloned objects are created by reference instead of having their own separate copies. This boosts the performance and efficiency of code. This pattern can also be used in the following cases:

- To eliminate the overhead of initializing an object
- When you want the system to be independent about how the products in it are created
- When creating objects from a database, whose values are copied to the cloned object

---

#### Singleton

The **singleton pattern** is a type of creational pattern that restricts the instantiation of a class to a **single** object. This allows the class to create an instance of the class the first time it is instantiated. However, on the next try, the existing instance of the class is returned. _No new instance is created_.

##### When to use the singleton pattern?

The singleton pattern is mostly used in cases where you want a single object to coordinate actions across a system. Singletons are mostly used by:

- **Services:** services can be singleton since they store the state, configuration, and provide access to resources. Therefore, it makes sense to have a single instance of a service in an application.
- **Databases:** when it comes to database connections, databases such as MongoDB utilize the singleton pattern.
- **Configurations:** if there is an object with a specific configuration, you don’t need a new instance every time that configuration object is needed.

---

#### Builder

The **builder pattern** is a type of creational pattern that helps in building complex objects using simpler objects. It provides a flexible and step-by-step approach towards making these objects. It also keeps the representation and process of creation shielded.

##### When to use the builder pattern?

You can use this design pattern when building apps that require you to create complex objects. It can help you hide the construction process of building these objects.

A good example would be a DOM, where you might need to create plenty of nodes and attributes. The construction process can get quite messy if you are building a complex DOM object. In cases like these, the builder pattern can be used.

---

---

## Structural design patterns

These patterns concern _class/object composition_ and relationships between objects. They let you add new functionalities to objects so that restructuring some parts of the system does not affect the rest. Hence, when some parts of structure change, the entire system does not need to change.

Structural design patterns: Facade, Adapter, Composite, Bridge, Flyweight, Proxy, Decorator.

---

#### Facade

In English, the word _facade_ means a _deceptive front or appearance_. Following this definition, a facade pattern provides a simpler interface that hides the complex functionalities of a system. This is widely used in JavaScript libraries like jQuery.

The facade pattern allows you to hide all the messy logic from the client and only display the clear and easy-to-use interface to them. This allows them to interact with an API easily in a less error-prone way and without accessing the inner workings directly.

##### When to use the facade pattern?

The facade pattern is used to simplify a client’s interaction with a system. So, it can be used when an application has a large and complex underlying code that the client does not need to see.

It can also be used when you want to interact with the methods present in a library without knowing the processing that happens in the background. An example can be of the JavaScript libraries such as jQuery.

---

#### Adapter

The **adapter pattern** allows classes that have different interfaces (properties/methods of an object) to work together. It translates the interface for a class to make it compatible with another class.

This pattern is useful if an API is modified or new implementations are added to it. In this case, if the other parts of a system are still using the old API, the adapter pattern will translate the interface so that the two can work together.

##### When to use the adapter pattern?

The adapter pattern is used when we need old APIs to work with new refactored ones or when an object needs to cooperate with a class that has an incompatible interface. It can also be used to reuse the existing functionality of classes.

---

#### Composite

The composite pattern is used to structure objects in a tree-like hierarchy. Here, each node of the tree can be composed of either child node(s) or be a leaf (no children objects). This pattern allows the client to work with these components uniformly, that is, a single object can be treated exactly how a group of objects is treated.

This pattern allows the formation of deeply-nested structures. If a _leaf_ object receives the request sent by the client, it will handle it. However, if the recipient is composed of children, the request is forwarded to the child components.

##### When to use the composite pattern?

The composite pattern is powerful as it allows us to treat an object as a composite. Since both single and composite objects share the same interface, it allows reusing objects without worrying about their compatibility.

You can use this pattern if you want to develop a scalable application that uses plenty of objects. It is particularly helpful in situations where you are dealing with a tree-like hierarchy of objects. An example of this pattern is being used by your operating system to create directories and subdirectories. Libraries like React and Vue also use this pattern to build reusable interfaces.

---

#### Bridge

The bridge pattern allows separate components with separate interfaces to work together. It keeps an object’s interface separate from its implementation, allowing the two to vary independently.

An example is controlling an air conditioner with a remote. The air conditioners can be of different types and each of them is controlled by a different remote. The remotes can vary, that is, a new one with better features can be introduced, but that won’t make any changes to the air conditioner classes. The same goes the other way round. The bridge pattern allows input and output devices to work together but vary independently.

##### When to use the bridge pattern?

You can use the bridge pattern if you want to:

- extend a class in several independent dimensions
- change the implementation at run time
- share the implementation between objects

---

#### Flyweight

It is a structural pattern that focuses on how related objects share data. It helps prevent repetitive code and increases efficiency when it comes to data sharing as well as conserving memory.

This pattern takes the common data structures/objects that are used by a lot of objects and stores them in an external object (**flyweight**) for sharing. You could say that it is used for caching purposes. So, the same data does not need to have separate copies for each object, instead, it is shared amongst all.

A _flyweight_ is an independent object that can be used in multiple contexts simultaneously. It cannot be distinguished from the instances of objects that are not sharable. A flyweight object can consist of two states:

- **intrinsic:** this state is stored in the flyweight. It contains the information required by the internal methods of objects. It is independent of the context of the flyweight and is sharable with other objects.
- **extrinsic:** this state depends on the context of the flyweight and it cannot be shared. Normally, the client objects pass the extrinsic state to the flyweight object when needed.

##### When to use the flyweight pattern?

This pattern should be used when your application has plenty of objects using similar data or when memory storage cost is high. JavaScript uses this pattern to share a list of immutable strings across the application.

This pattern is mostly used in applications like network apps or word processors. It can also be used in web browsers to prevent loading the same images twice. The flyweight pattern allows caching of images. Therefore, when a web page loads, only the new images are loaded from the Internet, the already existing ones are fetched from the cache.

---

#### Proxy

As the name implies, the proxy pattern is a structural pattern that creates a proxy object. It acts as a placeholder for another object, controlling the access to it.

Usually, an object has an interface with several properties/methods that a client can access. However, an object might not be able to deal with the clients’ requests alone due to heavy load or constraints such as dependency on a remote source that might cause delays (e.g., network requests). In these situations, adding a proxy helps in dividing the load with the target object.

The proxy object looks exactly like the target object. A client might not even know that they are accessing the proxy object instead of the target object. The proxy handles the requests from the clients and forwards them to the target object, preventing undue pressure on the target.

The proxy can also act as a cache and store the requests. When the same request is made again, it can just return it from the cache rather than forwarding it to the target. This allows the target to deal with a lesser number of requests.

##### When to use the proxy pattern?

The proxy pattern tries to reduce the workload on the target object. You can use it when dealing with heavy applications that perform a lot of network requests. Since delays could occur when responding to such requests, using a proxy pattern will allow the target object to not get overburdened with requests.

A real-life example is HTTP requests. These are expensive operations, therefore, the proxy pattern helps in reducing the number of requests forwarded to the target.

---

#### Decorator

The decorator pattern focuses on adding properties, functionalities, and behavior to existing classes dynamically. The additional decoration functionalities aren’t considered essential enough to be a part of the original class definition as they can cause clutter. Hence, the _decorator pattern_ lets you modify the code without changing the original class.

Unlike the creational patterns, the decorator pattern is a structural pattern that does not focus on object creation rather decoration. Hence, it doesn’t rely on prototypal inheritance alone; it takes the object and keeps adding decoration to it. This makes the process more streamlined.

##### When to use the decorator pattern?

JavaScript developers can use the decorator pattern when they want to easily modify or extend the functionality of an object without changing its base code.

It can also be used if an application has a lot of distinct objects with the same underlying code. Instead of creating all of them using different subclasses, additional functionalities can be added to the objects using the decorator pattern via `extends.

A simple example is _text formatting_, where you need to apply different formattings such as bold, italics, and underline to the same text.

---

---

## Behavioral design patterns

These patterns are concerned with communication between _dissimilar_ objects in a system. They streamline the communication and make sure the information is synchronized between such objects.

Behavioral design patterns: Chain of Responsibility, Strategy, Interpreter, Command, Observer, Iterator, Mediator, Visitor, Memento, State, Template Method, Revealing Module.

---

#### Chain of Responsibility

The **chain of responsibility** pattern allows a request sent by a client to be received by more than one object. It creates a chain of loosely-coupled objects that, upon receiving the request, either handle it or pass it to the next handler object.

A common example of this pattern is _event bubbling_ in DOM. An event propagates through different nested elements of the DOM until one of them handles it.

##### When to use the chain of responsibility pattern?

You can use it if your program is written to handle various requests in different ways without knowing the sequence and type of requests beforehand. It allows you to chain several handlers, thus, allowing all of them a chance to process the request.

A good example of the use of the chain of responsibility pattern is in the process of _event bubbling_ in the DOM, where the event propagates through the nested elements, one of which may choose to handle the event.

---

#### Command

The **command pattern** allows encapsulation of the requests or operations into separate objects. It decouples the objects that send requests from the objects responsible for executing those requests.

Consider an example where the client is accessing the methods of an API directly throughout the application. What will happen if the implementation of that API changes? The change will have to be made everywhere the API is being used. _To avoid this, we could make use of abstraction and separate the objects requesting from those implementing the request_. Now, if a change occurs, only the object making the call will need to change.

##### When to use the command pattern?

You can use it if you want to:

- queue and execute requests at different times
- perform operations such as reset or undo
- keep a history of requests made

---

#### Observer

The _observer pattern_ is a major behavioral design pattern. It allows objects (_observers_) that have subscribed to an event to wait for input and react to it when notified. This means they don’t have to continuously keep checking whether the input has been provided or not. The _main subject_ maintains a list of all the observers and whenever the event occurs, it notifies the observers so they can update their states accordingly.

Let’s look at a real-life example that we can map to this pattern. Consider a website that posts interesting articles. Every day, you visit the site to check for new articles and if there is none, you revisit after some time/days. What if you get a subscription to the website instead? Once you have the subscription, you’ll get notified every time a new article is posted. So now, instead of checking the site every few hours, you just wait for the notification about a new article.

##### When to use the observer pattern?

The observer pattern can be used to:

- To improve code management by breaking down large applications into a system of loosely-coupled objects
- provide greater flexibility by enabling a dynamic relationship between observers and subscribers which is otherwise not possible due to tight coupling
- improve communication between different parts of the application
- create a one-to-many dependency between objects that are loosely coupled

---

#### Iterator

The iterator pattern allows the definition of various types of iterators that can be used to iterate a collection of objects sequentially without exposing the underlying form.

Iterators encapsulate how the traversal occurs in an iteration. Most languages have built-in iterators such as IEnumerable and IEnumerator. The iterator pattern allows JavaScript developers to build other complex iterators which can be used to easily traverse collections that are stored in something complex such as graphs or trees. These iterators can then be used by the client to traverse a collection without having to know their inner workings.

Iterators follow the behavior where they call a _next_ function and step through a set of values until they reach the end. To do this, they need to maintain a reference to the current position as well as the collection they are traversing. Hence, an iterator has functions such as _next_, _hasNext_, _currentItem_, and _each_.

##### When to use the iterator pattern?

This pattern can be used when dealing with problems explicitly related to iteration, for designing flexible looping constructs and accessing elements from a complex collection without knowing the underlying representation. You can use it to implement a generic iterator that traverses any collection independent of its type efficiently.

---

#### Mediator

It is a behavioral pattern that allows a **mediator** (_a central authority_) to act as the coordinator between different objects, instead of the objects referring to each other directly. A _mediator_ as the name implies, is a central authority through which various components can communicate. It allows the loose coupling of objects.

A real-life example is a _chat application_. Here, the chat box acts as the _mediator_ through which various users interact with one another.

##### When to use the mediator pattern?

It can be used:

- If your system has multiple parts that need to communicate
- To avoid tight coupling of objects in a system with a lot of objects
- To improve code readability
- To make code easier to maintain
- If communication between objects becomes complex and hinders the reusability of code

---

#### Visitor

The visitor pattern allows the definition of new operations to the collection of objects without changing the structure of the objects themselves. This allows us to separate the class from the logic it implements.

The extra operations can be encapsulated in a **visitor** object. The objects can have a **visit** method that accepts the **visitor** object. The **visitor** can then make the required changes and perform the operations on the object that received it. This allows the developers to make future extensions, extend the libraries/frameworks, etc.

##### When to use the visitor pattern?

Visitor pattern can be used when:

- Similar operations need to be performed on different objects of a data structure
- Specific operations need to be performed on different objects in the data structure
- You want to add extensibility to libraries or frameworks

---

---

## Architectural design patterns

These patterns are used for solving architectural problems within a given context in software architecture.

Architectural design patterns: MVC, MVP, MVVM.

---

#### MVC

The **MVC** pattern stands for **model view controller** pattern. It is an architectural pattern used to organize the code of your application. It consists of three components:

- **Model:**

  This is the model component that manages the data that the application may require.

- **View**:

  The view is used for the visual representation of the current model. It renders data on the user’s side.

- **Controller**:

  The controller connects the model and the view components.

The _model_ is independent of the _view_, meaning, it is not concerned with the user interface and how the information is displayed on the user side. The _view_, on the other hand, is an observer of the _model_. Whenever the model gets modified (data is updated), it notifies its observer (the view) which then reacts accordingly.

As mentioned, _view_ is the visual representation of the model. Whenever it is notified of a change in the model, the view updates correspondingly. As the view layer is what the users get to see, this is also the layer they get to interact with, such as _editing_ or _updating_ attribute values.

The _controller_ is the connection between the model and the view. The _controller_ takes input from the user such as a _click_ or _keypress_ which updates the view side and then updates the model. It can sometimes update the view directly as well.

##### When to use the MVC pattern?

You can use this pattern if you want:

- improved application organization in your application
- faster development so that developers can work on different components of the application simultaneously
- to develop an application that loads fast as MVC supports asynchronous technique
- multiple views for the model
- to increase the scalability of the application as modification in separate components is easier

---

#### MVP

The MVP pattern stands for **model view presenter**. It is derived from the MVC pattern, which focuses on the user interface. MVP however, is focused on improving the _presentation_ logic.

It consists of three components:

- **Model:** provides the data that the application requires, which we want to display in the _view_
- **View:** to display the data from the model, it passes the user actions/commands to the presenter to act upon that data
- **Presenter:** acts as the middle man between the _model_ and the _view_. Retrieves data from the _model_, manipulates it, and returns it to view for display. It also reacts to the user’s interaction with the _view_.

##### What’s the difference between MVP and MVC?

|                                                        MVC                                                        |                                                                                         MVP                                                                                         |
| :---------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|                        The controller acts as the mediator between the model and the view                         |                                                          The presenter acts as the mediator between the model and the view                                                          |
|                                        Controller can share multiple views                                        |                                    The presenter has a one to one mapping with the view. If the view is complex, it can use multiple presenters                                     |
| The view can also communicate directly with the model by observing it for changes and updating itself accordingly | The model and the view are more separate in this pattern as the presenter reacts to user actions by retrieving and manipulating model data and returning it to the view for display |

##### When to use the MVP pattern?

You can use this pattern:

- If your application requires a lot of reuse of the presentation logic
- If your application requires a lot of user interaction
- If your application has complex views
- For easier testing as the presenter can provide a mock interface that can be unit tested

---

#### MVVM

The **MVVM** pattern stands for **model view viewModel** pattern. It is based on the MVC and MVP patterns. It is used to further separate the working of the user interface from the business logic in the application.

- **Model:** As seen in the MVC and MVP patterns, the model stores all the data and information required by the application. The model does not interfere with how this data will be manipulated or displayed.
- **View:** The view displays the information on the interface. It can also accept user input, hence, it contains behavior. In the MVVM pattern, the views aren’t _passive_. Passive views are manipulated by the controller or presenter and are responsible for displaying the information without having any knowledge of the model. However, in MVVM, views are _active_. They contain data-bindings, behavior, and events that require the knowledge of model and ViewModel. The view handles its events and it doesn’t depend on the ViewModel entirely. However, it does not maintain its state, for that, it syncs up with the ViewModel.
- **ViewModel:** Similar to the controller in the MVC, the ViewModel acts as the connection between the model and the view. It converts information from the model format to the view format for display. For example, the model might have a date stored in Unix format, whereas the view might display it in another format. Here, the ViewModel will help in converting the information. It also updates the model when a user action on the view occurs and is used to pass commands from view to the model. It is also used to maintain the view’s state and trigger events on it.

##### View and ViewModel

The view and ViewModel communicate via events, data binding, and method calls. While view maps its events to the ViewModel through commands, the ViewModel exposes model properties that are updated by the view through two-way data binding.

##### Model and ViewModel

ViewModel exposes the model and its properties for data binding. It also contains interfaces to fetch and format the properties it displays to the view.

##### When to use the MVVM pattern?

You can use this pattern if you want:

- to display the data stored in the model in a different format on the view side
- to slim down the model’s number to view transformations that the controller is handling in MVC
- to make your application more maintainable, reusable, and extendable

---
