# @klodianimeri/channeljs

A lightweight, zero-dependency, pull-based multicast async channel for JavaScript and TypeScript. Built on native `for await...of` iteration with O(1) cursor queue draining and configurable lifecycle modes.

- **Zero Dependencies:** Tiny single-class implementation (~690 B gzipped) with full TypeScript types.
- **Native Multicast:** Fan out messages to N concurrent `for await...of` consumers without `.tee()` cloning overhead.
- **Cross-Runtime Fast:** Up to **76.3x faster** subscriber churn than `events.on()`, **27.6x faster** than `ReadableStream.tee()`, and **3x faster** than `PassThrough` pipelines across Node, Deno, Bun.
- **Automatic Cleanup:** Breaking out of a `for await...of` loop immediately unsubscribes the consumer without memory leaks.
- **Configurable Modes:** Choose between `"raw"`, `"safe"`, and `"strict"` closed-state behavior.

---

## Installation

```bash
npm install @klodianimeri/channeljs
```

### Browser CDN (UMD)

```html
<script src="https://unpkg.com/@klodianimeri/channeljs@^1/dist/index.umd.js"></script>
<script>
  const { Channel } = channeljs;
</script>
```

---

## Quick Start

### Basic Multicast (`for await...of`)

Every active consumer receives every message sent to the channel in FIFO order.

```typescript
import { Channel } from "@klodianimeri/channeljs";

const channel = new Channel<string>();

// Consumer 1
const logger = (async () => {
  for await (const event of channel) {
    console.log("[Logger]:", event);
  }
})();

// Consumer 2
const analytics = (async () => {
  for await (const event of channel) {
    console.log("[Analytics]:", event);
  }
})();

channel.send("user:login");
channel.send("order:created");
channel.close();

await Promise.all([logger, analytics]);
```

### Automatic Unsubscription on `break`

If a consumer exits early with `break`, `return`, or a thrown error, it automatically unsubscribes while other consumers continue receiving messages unaffected.

```typescript
const channel = new Channel<number>();

const firstTwo = (async () => {
  for await (const n of channel) {
    console.log("Got:", n);
    if (n === 2) break; // Automatically unsubscribes
  }
})();

channel.send(1);
channel.send(2);
await firstTwo;

channel.send(3); // Only remaining active consumers receive this
channel.close();
```

---

## Channel Modes

Configure how `send()`, `close()`, and late subscribers behave after a channel closes using the `mode` option:

```typescript
import { Channel, ChannelClosedError } from "@klodianimeri/channeljs";

// 1. "raw" (Default) — Maximum throughput, zero post-close guards
const raw = new Channel<number>();

// 2. "safe" — Idempotent close(), ignores post-close send(), completes late iterators immediately
const safe = new Channel<number>({ mode: "safe" });

// 3. "strict" — Throws ChannelClosedError on post-close send() or duplicate close()
const strict = new Channel<number>({ mode: "strict" });
```

### Mode Comparison

| Behavior | `"raw"` (Default) | `"safe"` | `"strict"` |
| :--- | :--- | :--- | :--- |
| **`send()` after `close()`** | Pushes to active set (empty) | Silently ignored (no-op) | Throws `ChannelClosedError` |
| **Calling `close()` twice** | Re-pushes `done: true` | Silently ignored (idempotent) | Throws `ChannelClosedError` |
| **Subscribing after `close()`** | Waits for future sends | Exits immediately (`done: true`) | Exits immediately (`done: true`) |
| **Hot-path throughput** | Maximum | Identical | Identical |

---

## API Reference

### `new Channel<T = any, TReturn = any>(options?: ChannelOptions)`
Creates a new multicast channel.
- `options.mode`: `"raw" | "safe" | "strict"` (defaults to `"raw"`).

### `channel.send(data: T): void`
Delivers `data` to all active consumers. If a consumer is awaiting the next value, its promise resolves immediately; otherwise, the value is queued in an O(1) cursor buffer.

### `channel.close(value?: TReturn): void`
Signals completion (`done: true`) to all active consumers and clears internal subscriber references. Optionally accepts a final return `value` for manual `.next()` consumers.

### `channel.closed: boolean`
Read-only boolean indicating whether `close()` has been called.

### `channel.mode: ChannelMode`
Read-only string returning the configured mode (`"raw"`, `"safe"`, or `"strict"`).

### `channel[Symbol.asyncIterator](): AsyncIterableIterator<T, TReturn>`
Returns an `AsyncIterableIterator` supporting `for await...of`, `next()`, `return()`, and `throw()`.

---

## Architecture & Performance

`@klodianimeri/channeljs` is designed around zero-allocation hot paths and predictable `O(1)` memory management:

- **Pointer-Based Ring Buffer (`O(1)` Dequeue):** Each consumer maintains an independent buffer with a moving `head` cursor that resets in place when drained—avoiding `O(n)` `Array.prototype.shift()` penalties and unnecessary `Promise` allocations when messages are already buffered.
- **Native `#private` Slots (Default `ES2022`):** Uses V8-optimized native private fields for near-zero instantiation overhead (~13× faster instantiation and ~5× faster throughput compared to legacy `WeakMap`-polyfilled private fields).
- **Linear Concurrency Scaling (`O(N)`):** Each active `for await...of` listener consumes roughly **~1.15 KB** of heap memory, allowing a single channel to sustain **1,000,000+ concurrent active listeners** without memory leaks or quadratic degradation.
- **Zero-Contention Multi-Producer Fan-Out:** Multiple async producers can call `send()` concurrently while independent consumers join, consume, or `break` early without blocking sibling cursors or dropping per-sender FIFO order.

### Build Target Characteristics

| Metric | `ES2022` (Default Import) | `ES6` (`@klodianimeri/channeljs/es6`) |
| :--- | :--- | :--- |
| **Private State** | Native `#private` class slots | Self-contained `WeakMap` + brand helpers |
| **Instantiation Cost** | Negligible (single hidden-class object) | Higher (`WeakMap` registration per instance) |
| **Streaming & Fan-Out** | Maximum throughput | Within ~3–5% of `ES2022` once streaming |
| **Best For** | Node.js 18+, modern bundlers, modern browsers | Legacy bundlers and ES2015 target environments |


---

### Legacy ES6 Environments

By default, `@klodianimeri/channeljs` serves an **ES2022** build using native private class fields (`#private`). For older bundlers or ES2015 targets, import from the `/es6` subpath:

```typescript
import { Channel } from "@klodianimeri/channeljs/es6";
```

---

## Bundle Size

`@klodianimeri/channeljs` ships with **zero dependencies** and full TypeScript declarations (`0.48 kB`). The default `ES2022` build weighs **under 1 kB gzipped** (unminified).

| Target | Format | Entry Path | Unminified | Gzipped |
| :--- | :--- | :--- | :--- | :--- |
| **ES2022** *(Default)* | ESM | `dist/index.js` | `2.81 kB` | **`0.91 kB`** |
| **ES2022** *(Default)* | CJS | `dist/index.cjs` | `2.92 kB` | **`0.96 kB`** |
| **ES2022** *(Default)* | UMD | `dist/index.umd.js` | `3.39 kB` | **`1.09 kB`** |
| **ES6** (`/es6`) | ESM | `dist/es6/index.js` | `5.13 kB` | **`1.39 kB`** |
| **ES6** (`/es6`) | CJS | `dist/es6/index.cjs` | `5.24 kB` | **`1.44 kB`** |
| **ES6** (`/es6`) | UMD | `dist/es6/index.umd.js` | `5.73 kB` | **`1.57 kB`** |

> **Note:** Source maps (`.map`) and `.d.ts` / `.d.cts` type declarations are included in the published package for debugging and IDE support, and are excluded from runtime application bundles.

---