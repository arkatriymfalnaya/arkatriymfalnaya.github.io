---
title: javascripts maps tips & tricks
description:
date: 2022-12-24
tags: ["computer_science", "javascripts", "conspects"]
---

### Maps

#### When should I use a Map, and when should I use an object?

If you need a dictionary-like data structure with keys that are neither strings nor symbols, you have no choice: you must use a Map.

If, however, your keys are either strings or symbols, you must decide whether or not to use an object. A rough general guideline is:

- Is there a fixed set of keys (known at development time)?
  Then use an object `obj` and access the values via fixed keys:
  ```
  const value = obj.key;
  ```
- Can the set of keys change at runtime?
  Then use a Map `map` and access the values via keys stored in variables:
  ```
  const theKey = 123;
  map.get(theKey);
  ```

#### When would I use an object as a key in a Map?

You normally want Map keys to be compared by value (two keys are considered equal if they have the same content). That excludes objects. However, there is one use case for objects as keys: externally attaching data to objects. But that use case is served better by WeakMaps, where entries don’t prevent keys from being garbage-collected.

#### Why do Maps preserve the insertion order of entries?

In principle, Maps are unordered. The main reason for ordering entries is so that operations that list entries, keys, or values are deterministic. That helps, for example, with testing.

#### Why do Maps have a `.size`, while Arrays have a `.length`?

In JavaScript, indexable sequences (such as Arrays and strings) have a `.length`, while unindexed collections (such as Maps and Sets) have a `.size`:

- `.length` is based on indices; it is always the highest index plus one.
- `.size` counts the number of elements in a collection.

---

### WeakMaps

WeakMaps are similar to Maps, with the following differences:

- They are black boxes, where a value can only be accessed if you have both the WeakMap and the key.
- The keys of a WeakMap are _weakly held_: if an object is a key in a WeakMap, it can still be garbage-collected. That lets us use WeakMaps to attach data to objects.

It is impossible to inspect what’s inside a WeakMap:

- For example, you can’t iterate or loop over keys, values or entries. And you can’t compute the size.
- Additionally, you can’t clear a WeakMap either – you have to create a fresh instance.

These restrictions enable a security property. Quoting [Mark Miller](https://github.com/tc39/tc39-notes/blob/master/meetings/2014-11/nov-19.md#412-should-weakmapweakset-have-a-clear-method-markm):

> The mapping from weakmap/key pair value can only be observed or affected by someone who has both the weakmap and the key. With `clear()`, someone with only the WeakMap would’ve been able to affect the WeakMap-and-key-to-value mapping.

The keys of a WeakMap are said to be _weakly held_: Normally if one object refers to another one, then the latter object can’t be garbage-collected as long as the former exists. With a WeakMap, that is different: If an object is a key and not referred to elsewhere, it can be garbage-collected while the WeakMap still exists. That also leads to the corresponding entry being removed (but there is no way to observe that).

### WeakSets

WeakSets are similar to Sets, with the following differences:

- They can hold objects without preventing those objects from being garbage-collected.
- They are black boxes: we only get any data out of a WeakSet if we have both the WeakSet and a value. The only methods that are supported are `.add()`, `.delete()`, `.has()`. Consult the section on [WeakMaps as black boxes](https://exploringjs.com/impatient-js/ch_weakmaps.html#weakmaps-as-black-boxes) for an explanation of why WeakSets don’t allow iteration, looping, and clearing.

Given that we can’t iterate over their elements, there are not that many use cases for WeakSets. They do enable us to mark objects.

#### TLDR:

Suppose you added an object as a value to a `Set` or as a key to a `Map`. If that object is no longer needed in your application, it can’t be garbage collected. The `Set` or the `Map` that holds on to the object will prevent it from being cleaned up. This is not very gentle on memory usage and may be an issue in some applications that use a large amount of data. `WeakSet`, a counterpart of `Set`, and `WeakMap`, a counterpart of `Map`, can be used to solve this issue since both have a minimal impact on memory usage.

The word `weak` refers to coupling, as in weak coupling. A `Set`, for example, tightly holds onto the data that is added. However, a `WeakSet` will hold only weakly and will not prevent the object from being released.
