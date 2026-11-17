import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Channel, ChannelClosedError } from "./../src/index.ts";

describe("Channel - Core Delivery & Multicast", () => {
    it("delivers messages in FIFO order to a single consumer", async () => {
        const ch = new Channel<number>();
        const received: number[] = [];

        const consumer = (async () => {
            for await (const val of ch) {
                received.push(val);
            }
        })();

        ch.send(1);
        ch.send(2);
        ch.send(3);
        ch.close();

        await consumer;
        assert.deepEqual(received, [1, 2, 3]);
    });

    it("handles synchronous burst sends queued into consumer buffer", async () => {
        const ch = new Channel<number>();
        const received: number[] = [];

        // Consumer subscribes and awaits first item; producer bursts 1,000 items synchronously
        const consumer = (async () => {
            for await (const val of ch) {
                received.push(val);
            }
        })();

        for (let i = 0; i < 1_000; i++) {
            ch.send(i);
        }
        ch.close();

        await consumer;
        assert.equal(received.length, 1_000);
        assert.equal(received[0], 0);
        assert.equal(received[999], 999);
    });

    it("multicasts every message to multiple concurrent consumers", async () => {
        const ch = new Channel<string>();

        const consume = async () => {
            const items: string[] = [];
            for await (const msg of ch) {
                items.push(msg);
            }
            return items;
        };

        const c1 = consume();
        const c2 = consume();
        const c3 = consume();

        ch.send("alpha");
        ch.send("beta");
        ch.close();

        const [r1, r2, r3] = await Promise.all([c1, c2, c3]);
        assert.deepEqual(r1, ["alpha", "beta"]);
        assert.deepEqual(r2, ["alpha", "beta"]);
        assert.deepEqual(r3, ["alpha", "beta"]);
    });

    it("supports undefined and null as valid payload values", async () => {
        const ch = new Channel<number | null | undefined>();
        const received: Array<number | null | undefined> = [];

        const consumer = (async () => {
            for await (const val of ch) {
                received.push(val);
            }
        })();

        ch.send(undefined);
        ch.send(null);
        ch.send(0);
        ch.close();

        await consumer;
        assert.deepEqual(received, [undefined, null, 0]);
    });
});

describe("Channel - Consumer Cleanup & Iterator Protocol", () => {
    it("cleans up consumer on early break without affecting other consumers", async () => {
        const ch = new Channel<number>();
        const fastResults: number[] = [];
        const fullResults: number[] = [];

        const fastConsumer = (async () => {
            for await (const val of ch) {
                fastResults.push(val);
                if (val === 2) break;
            }
        })();

        const fullConsumer = (async () => {
            for await (const val of ch) {
                fullResults.push(val);
            }
        })();

        ch.send(1);
        ch.send(2);
        await fastConsumer;

        ch.send(3);
        ch.send(4);
        ch.close();
        await fullConsumer;

        assert.deepEqual(fastResults, [1, 2]);
        assert.deepEqual(fullResults, [1, 2, 3, 4]);
    });

    it("supports manual iterator.throw() and unsubscribes the consumer", async () => {
        const ch = new Channel<number>();
        const iterator = ch[Symbol.asyncIterator]();

        ch.send(10);
        const first = await iterator.next();
        assert.deepEqual(first, { done: false, value: 10 });

        await assert.rejects(
            () => iterator.throw!(new Error("consumer aborted")),
            /consumer aborted/
        );

        ch.send(20);
        ch.close();
    });

    it("returns a custom close value on manual iterator.next()", async () => {
        const ch = new Channel<number, string>();
        const iterator = ch[Symbol.asyncIterator]();

        ch.send(1);
        ch.close("FINAL_STATUS");

        assert.deepEqual(await iterator.next(), { done: false, value: 1 });
        assert.deepEqual(await iterator.next(), { done: true, value: "FINAL_STATUS" });
    });

    it("is itself an AsyncIterableIterator when calling [Symbol.asyncIterator]()", () => {
        const ch = new Channel<number>();
        const it = ch[Symbol.asyncIterator]();
        assert.equal(it[Symbol.asyncIterator](), it);
    });
});

describe("Channel - Modes (raw, safe, strict)", () => {
    it('mode: "safe" ignores post-close sends and duplicate close()', async () => {
        const ch = new Channel<number>({ mode: "safe" });
        assert.equal(ch.mode, "safe");
        assert.equal(ch.closed, false);

        const received: number[] = [];
        const consumer = (async () => {
            for await (const val of ch) {
                received.push(val);
            }
        })();

        ch.send(1);
        ch.close("done");
        assert.equal(ch.closed, true);

        assert.doesNotThrow(() => {
            ch.send(2);
            ch.close("again");
        });

        await consumer;
        assert.deepEqual(received, [1]);

        const lateIt = ch[Symbol.asyncIterator]();
        assert.deepEqual(await lateIt.next(), { done: true, value: "done" });
    });

    it('mode: "strict" throws ChannelClosedError on post-close send() or close()', async () => {
        const ch = new Channel<number>({ mode: "strict" });
        assert.equal(ch.mode, "strict");

        ch.send(1);
        ch.close("finished");
        assert.equal(ch.closed, true);

        assert.throws(() => ch.send(2), ChannelClosedError);
        assert.throws(() => ch.close(), ChannelClosedError);

        const lateResults: number[] = [];
        for await (const val of ch) {
            lateResults.push(val);
        }
        assert.deepEqual(lateResults, []);
    });

    it('mode: "raw" defaults to raw mode and delivers messages cleanly', async () => {
        const ch = new Channel<number>();
        assert.equal(ch.mode, "raw");

        const received: number[] = [];
        const consumer = (async () => {
            for await (const val of ch) {
                received.push(val);
            }
        })();

        ch.send(42);
        ch.close();
        await consumer;

        assert.deepEqual(received, [42]);
        assert.equal(ch.closed, true);
    });
});
