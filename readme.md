# ChannelJS

Simple and lightweight async communications using channels. Minimal single class code.

Works in browser and node.

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
    941 B: index.cjs.gz
    807 B: index.cjs.br
    500 B: index.modern.js.gz
    410 B: index.modern.js.br
    944 B: index.module.js.gz
    812 B: index.module.js.br
   1010 B: index.umd.js.gz
    872 B: index.umd.js.br
 ```