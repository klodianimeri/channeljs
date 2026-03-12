# ChannelJS

Simple, unbuffered, multicast async communication using channels.

ChannelJS is an ultra-lightweight, zero-dependency communication bus for JavaScript and TypeScript. It is purpose-built for high-frequency messaging, focusing on minimal microtask overhead and the clean ergonomics of Async Iterators.


## Why ChannelJS?

**Fast-Path Execution:** Boosts throughput by 25%+ by resolving synchronously when data is available—bypassing the microtask queue and avoiding unnecessary Promise allocations.

**True Multicast:** A single send() call efficiently broadcasts messages to hundreds of concurrent for await consumers.

**Zero-Management Memory:** Features built-in automatic cleanup via the AsyncIterator.return() protocol. No more manual removeListener calls or memory leaks.

**Nano-Scale Footprint:** A single, optimized class under 1KB. Perfect for microservices, edge computing, and performance-critical browser apps.

**Universal Compatibility:** Works seamlessly in both Node.js and modern browsers.


## Key Features

**Unbuffered Multicast:** Real-time data delivery to all active listeners.

**Native Async Iteration:** Use standard for await...of loops for a clean, readable API.

**Microtask Optimized:** Designed to minimize the "Async Tax" on low-end hardware.

**Polyfilled Safety:** Includes a lightweight Promise.withResolvers polyfill for older environments.


## Installation

```js
npm i @klodianimeri/channeljs
```

## Initialize

```js
import { Channel } from "@klodianimeri/channeljs";

const channel = new Channel();
```

## Reciving data

Multicast by nature, you can have multiple recivers on one channel.

```js
async function log(channel) {
    for await (const element of channel) {
        console.log(element)
    }

    console.log('Channel closed!');
}

async function count(channel) {
    let i = 0;

    for await (const element of channel) {
        i++;
    }

    console.log(`Count: ${i}`);
}

log(channel);

count(channel);
```

## Sending data

A channel does not buffer the values. If no recivers on the channel the values are discarded.

Calling 'close' ends all the current recivers on the channel.

```js
channel.send("Hello World!");

channel.close();
```

## Browser

https://unpkg.com/@klodianimeri/channeljs@^1/dist/index.umd.js

The global namespace is channeljs:

```js
const { Channel } = channeljs;
```

## Build Statistics

```
    938 B: index.cjs.gz
    809 B: index.cjs.br
    541 B: index.modern.js.gz
    448 B: index.modern.js.br
    936 B: index.module.js.gz
    809 B: index.module.js.br
   1004 B: index.umd.js.gz
    891 B: index.umd.js.br
 ```