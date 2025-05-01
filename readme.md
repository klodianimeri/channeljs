# ChannelJS

Simple and lightweight async communications using channels.

## Usage

Send and reciving data.

```js
    async function log(channel) {
        for await (const element of channel) {
            console.log(element)
        }
    }

    const channel = new Channel();

    log(channel);

    channel.send("Hello World!");

    channel.close();
```

A channel does not buffer the values.

Multicast by nature, you can have multiple recivers on one channel.