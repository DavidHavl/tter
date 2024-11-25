# tter

[![npm version](https://badge.fury.io/js/%40davidhavl%2Ftter.svg)](https://badge.fury.io/js/%40davidhavl%2Ftter)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org)
[![Build Status](https://github.com/davidhavl/tter/workflows/CI/badge.svg)](https://github.com/davidhavl/tter/actions)
[![Coverage Status](https://coveralls.io/repos/github/davidhavl/tter/badge.svg?branch=main)](https://coveralls.io/github/davidhavl/tter?branch=main)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/%40davidhavl%2Ftter)](https://bundlephobia.com/package/%40davidhavl%2Ftter)
[![Dependencies Status](https://status.david-dm.org/gh/davidhavl/tter.svg)](https://david-dm.org/davidhavl/tter)
[![License](https://img.shields.io/npm/l/%40davidhavl%2Ftter.svg)](https://github.com/davidhavl/tter/blob/main/LICENSE)

### Minimal, lightweight, fully typed and edge compatible Event Emitter.

## Table of Contents
1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Usage Examples](#usage-examples)
4. [API Reference](#api-reference)
    - [emitter](#emitter)
    - [createEmitter](#createemitter)
    - [defineHandler](#definehandler)
    - [defineHandlers](#definehandlers)
    - [Emitter API Documentation](#emitter)
5. [Types](#types)

## Introduction


This library provides a fully typed lightweight event emitter, allowing you to easily implement and manage event-driven architectures in your applications.
Event driven logic flow enables you to decouple your code and make it more modular and maintainable.

This library became the base for my work on event emitter middleware package in [Hono](https://github.com/honojs/middleware/tree/main/packages/event-emitter) framework.

See [FAQ](#faq) bellow for some common questions.

## Installation

```sh
npm install @davidhavl/tter
# or
yarn add @davidhavl/tter
# or
pnpm add @davidhavl/tter
# or
bun install @davidhavl/tter
```

## Usage

#### Define event handlers after emitter initialization
```ts
import { createEmitter  } from '@davidhavl/tter'

// type User = {
//   id: string,
//   title: string,
//   role: string
// }

// Define available events and their payload types
type AvailableEvents = {
  // event key: payload type
  'user:created': User;
  'user:updated': User;
  'user:deleted': string,
  'foo': { bar: number, baz: string };
}

// Initialize emitter with handler types
const ee = createEmitter<AvailableEvents>()


// Assign event handlers
ee.on('user:created', async (payload) => { // Payload will be correctly inferred as User
    console.log('User created:', payload)
})

// Emit event and pass the payload
ee.emit('user:deleted', userId) // The second argument will correctly be enforced to be a string
// Emit async event and pass the payload
ee.emitAsync('user:created', user) // The second argument will correctly be enforced to conform to the User type
```

#### OR define event handlers before emitter initialization

```ts
import { createEmitter, defineHandlers } from '@davidhavl/tter'

// type User = {
//   id: string,
//   title: string,
//   role: string
// }

// Define event handlers first
export const handlers = defineHandlers({
  'user:created': [
    async (user: User) => {}
  ],
  'foo': [
    (payload: string) => {}
  ]
})

// Initialize emitter with handlers
const ee = createEmitter(handlers)

// Emit event and pass the payload
ee.emit('foo', { bar: 1, baz: 'hello' }) // The "payload" argument will correctly be enforced to conform to the right type

// Emit async event and pass the payload
ee.emitAsync('user:created', payload) // The "payload" argument will correctly be enforced to conform to the User type

export default ee

```

## API Reference

### createEmitter

Creates new instance of event emitter with provided handlers.

```ts
function createEmitter<EPMap extends EventPayloadMap>(
    eventHandlers?: EventHandlers<EPMap>,
    options?: EventEmitterOptions
): Emitter<EPMap>
```

#### Parameters
- `eventHandlers` - (optional): An object containing initial event handlers. Each key is event name and value is array of event handlers.
- `options` - (optional): An object containing options for the emitter. Currently, the only option is `maxHandlers`, 
which is the maximum number of handlers that can be added to a single event. The default is `10`.

#### Returns

An `Emitter` instance:

#### Example

```ts
const ee = createEmitter(eventHandlers);
```

### defineHandler

A utility function to define a typed event handler.

```ts
function defineHandler<EPMap extends EventPayloadMap, Key extends keyof EPMap, E extends Env = Env>(
    handler: EventHandler<EPMap[Key], E>,
): EventHandler<EPMap[Key], E>
```

#### Parameters
- `handler`: The event handler function to be defined.

#### Type parameters
- `EPMap`: The available event key to payload map i.e.: `type AvailableEvents = { 'user:created': { name: string } };`.
- `Key`: The key of the event type.

#### Returns

The same event handler function with proper type inference.

#### Example

```ts
type AvailableEvents = {
    'user:created': { name: string };
};

const handler = defineHandler<AvailableEvents, 'user:created'>((payload) => {
    console.log('New user created:', payload)
})
```

### defineHandlers

A utility function to define multiple typed event handlers.

```ts
function defineHandlers<EPMap extends EventPayloadMap, E extends Env = Env>(
    handlers: { [K in keyof EPMap]?: EventHandler<EPMap[K], E>[] },
): { [K in keyof EPMap]?: EventHandler<EPMap[K], E>[] }
```

#### Parameters
- `handlers`: An object containing event handlers for multiple event types/keys.

#### Type parameters
- `EPMap`: The available event key to payload map i.e.: `type AvailableEvents = { 'user:created': { name: string } };`.

#### Returns

The same handlers object with proper type inference.

#### Example

```ts
type AvailableEvents = {
    'user:created': { name: string };
};

const handlers = defineHandlers<AvailableEvents>({
    'user:created': [
        (payload) => {
            console.log('New user created:', pyload)
        }
    ]
})
```
## Emitter instance methods
The `Emitter` interface provides methods for managing and triggering events. Here's a detailed look at each method:

### on

Adds an event handler for the specified event key.

#### Signature

```ts
function on<Key extends keyof EventPayloadMap>(
        key: Key,
        handler: EventHandler<EventPayloadMap[Key]>
): void
```

#### Parameters

- `key`: The event key to listen for. Must be a key of `EventHandlerPayloads`.
- `handler`: The function to be called when the event is emitted. If using within a middleware or request handler, do not use anonymous or closure functions! 
 It should accept one parameter:
    - `payload`: The payload passed when the event is emitted. The type of the payload is inferred from the `EventHandlerPayloads` type.

#### Returns

`void`

#### Example

Using outside the request handler:
```ts
type AvailableEvents = {
    'user:created': { name: string };
};
const ee = createEmitter<AvailableEvents>();

// If adding event handler outside of middleware or request handler, you can use both, named or anonymous function.
ee.on('user:created', (user) => {
    console.log('New user created:', user)
})
```
Using within request handler:
```ts
type AvailableEvents = {
    'user:created': { name: string };
};

// Define event handler as NAMED function, OUTSIDE of the request handler to prevent duplicates/memory leaks
const namedHandler = defineHandler<AvailableEvents, 'user:created'>((user) => {
    console.log('New user created:', user)
})

const ee = createEmitter<AvailableEvents>();

const app = new Hono();

app.use((next) => {
    ee.on('user:created', namedHandler)
    return next()
})
```

### off

Removes an event handler for the specified event key.

#### Signature

```ts
function off<Key extends keyof EventPayloadMap>(
    key: Key,
    handler?: EventHandler<EventPayloadMap[Key]>
): void
```

#### Parameters
- `key`: The event key to remove the handler from. Must be a key of `EventPayloadMap`.
- `handler` (optional): The specific handler function to remove. If not provided, all handlers for the given key will be removed.

#### Returns
`void`

#### Example

```ts
type AvailableEvents = {
    'user:created': { name: string };
};

const ee = createEmitter<AvailableEvents>();

const logUser = defineHandler<AvailableEvents, 'user:created'>((user) => {
    console.log(`User: ${user.name}`);
});

ee.on('user:created', logUser);

// Later, to remove the specific handler:
ee.off('user:created', logUser);

// Or to remove all handlers for 'user:created':
ee.off('user:created');
```


### emit

Synchronously emits an event with the specified key and payload.
For async event emission, use `emitAsync`.

#### Signature

```ts
emit<Key extends keyof EventPayloadMap>(
    key: Key,
    payload: EventPayloadMap[Key]
): void
```

#### Parameters
- `key`: The event key to emit. Must be a key of `EventPayloadMap`.
- `payload`: The payload to pass to the event handlers. The type of the payload is inferred from the `EventPayloadMap` type.

#### Returns

`void`

#### Example

```ts
app.post('/users', (c) => {
    const user = { name: 'Alice' };
    ee.emit('user:created', user);
});
```

### emitAsync

Asynchronously emits an event with the specified key and payload.

#### Signature

```ts
emitAsync<Key extends keyof EventPayloadMap>(
    key: Key,
    payload: EventPayloadMap[Key],
    options?: EmitAsyncOptions
): Promise<void>
```

#### Parameters
- `key`: The event key to emit. Must be a key of `EventPayloadMap`.
- `payload`: The payload to pass to the event handlers. The type of the payload is inferred from the `EventPayloadMap` type.
- `options` (optional): An object containing options for the asynchronous emission. 
   Currently, the only option is `mode`, which can be `'concurrent'` (default) or `'sequencial'`.
    - The `'concurrent'` mode will call all handlers concurrently (at the same time) and resolve or reject (with aggregated errors) after all handlers settle.
    - The `'sequencial'` mode will call handlers one by one and resolve when all handlers are done or reject when the first error is thrown, not executing rest of the handlers.

#### Returns

`Promise<void>`

#### Example

```ts
app.post('/users', async (c) => {
    const user = { name: 'Alice' };
    await ee.emitAsync('user:created', user);
    // await ee.emitAsync('user:created', user, { mode: 'sequencial' });
});
```

## Types

### EventKey
A string literal type representing an event key.

```ts
type EventKey = string | symbol
```

### EventHandler
A function type that handles an event.

```ts
type EventHandler<T> = (payload: T) => void | Promise<void>
```

### EventHandlers
An object type containing event handlers for multiple event types/keys.

```ts
type EventHandlers<T> = { [K in keyof T]?: EventHandler<T[K]>[] }
```

### EventPayloadMap
An object type containing event keys and their corresponding payload types.

```ts
type EventPayloadMap = Record<EventKey, any>
```

### EventEmitterOptions

An object type containing options for the `Emitter` class.

```ts
type EventEmitterOptions = { maxHandlers?: number };
```

### EmitAsyncOptions
An object type containing options for the `emitAsync` method.

```ts
type EmitAsyncOptions = {
    mode?: 'concurrent' | 'sequencial'
}
```

### Emitter

An interface representing an event emitter.

```ts
interface Emitter<EventPayloadMap> {
   on<Key extends keyof EventPayloadMap>(key: Key, handler: EventHandler<EventPayloadMap[Key]>): void;
   off<Key extends keyof EventPayloadMap>(key: Key, handler?: EventHandler<EventPayloadMap[Key]>): void;
   emit<Key extends keyof EventPayloadMap>(key: Key, payload: EventPayloadMap[Key]): void;
   emitAsync<Key extends keyof EventPayloadMap>(
       key: Key,
       payload: EventPayloadMap[Key],
       options?: EmitAsyncOptions
   ): Promise<void>;
}
```

For more usage examples, see the [tests](src/index.test.ts) or [Hono REST API starter kit](https://github.com/DavidHavl/hono-rest-api-starter)

## FAQ
### What the heck is event emitter and why should I use it?
Event emitter is a pattern that allows you to decouple your code and make it more modular and maintainable.
It's a way to implement the observer pattern in your application.
It's especially useful in larger projects or projects with a lot of interactions between features.
Just imagine you have a user registration feature, and you want to send a welcome email after the user is created. You can do this by emitting an event `user:created` and then listen to this event in another part of your application (e.g. email service).
### How is this different to the built-in EventEmitter in Node.js?
The build-in EventEmitter has huge API surface, weak TypeScript support and does only synchronous event emitting. Tter is designed to be minimal, lightweight, edge compatible and fully typed. It also supports async event handlers.
### Why another event emitter library? Isn't there enough of them already?
Yes, there are many event emitter libraries out there, but os of the initial writing of this library, most of them are either too complex or not fully typed.
### Is there a way to define event handlers with types?
Yes, you can use `defineHandlers` and `defineHandler` functions to define event handlers with types. This way you can leverage TypeScript's type inference and get better type checking.
### Does it support async event handlers?
Yes, it does. You can use async functions as event handlers and emit the events using `emitAsync` method.
### What happens if I emit an event that has no handlers?
Nothing. The event will be emitted, but no handlers will be called.
### Using `emitAsync` function, what happens if one or more of the handlers reject?
- If using `{ mode = 'concurrent' }` in the options (which is the default), it will call all handlers concurrently (at the same time) and resolve or reject (with aggregated errors) after all handlers settle.
- If using `{ mode = 'sequencial' }` in the options, it will call handlers one by one and resolve when all handlers are done or reject when the first error is thrown, not executing rest of the handlers.

## Author

David Havl <https://github.com/DavidHavl>

## License

MIT
