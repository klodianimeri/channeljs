import { bench, group, run } from "mitata";
import { EventEmitter, on } from "node:events";
import { PassThrough } from "node:stream";
import { Channel } from "../src/index.ts";

// ==========================================
// 1. Paced Lockstep Producer/Consumer (Microtask Ping-Pong)
// ==========================================
group("1. Paced Lockstep Ping-Pong (5,000 messages, 0 buffer)", () => {
    bench("Channel (safe)", async () => {
        const ch = new Channel<number>({ mode: "safe" });
        const consumer = (async () => {
            let sum = 0;
            for await (const val of ch) sum += val;
            return sum;
        })();

        for (let i = 0; i < 5_000; i++) {
            ch.send(i);
            await Promise.resolve();
        }
        ch.close();
        await consumer;
    });

    bench("Node PassThrough stream", async () => {
        const pt = new PassThrough({ objectMode: true });
        const consumer = (async () => {
            let sum = 0;
            for await (const val of pt as AsyncIterable<number>) sum += val;
            return sum;
        })();

        for (let i = 0; i < 5_000; i++) {
            pt.write(i);
            await Promise.resolve();
        }
        pt.end();
        await consumer;
    });
});

// ==========================================
// 2. Multi-Stage Async Pipeline (Ch -> Transform -> Ch -> Sink)
// ==========================================
group("2. 3-Stage Async Pipeline (10,000 messages)", () => {
    bench("Channel 3-Stage Pipeline", async () => {
        const ch1 = new Channel<number>({ mode: "safe" });
        const ch2 = new Channel<number>({ mode: "safe" });
        const ch3 = new Channel<number>({ mode: "safe" });

        const stage1 = (async () => {
            for await (const n of ch1) {
                if ((n & 1) === 0) ch2.send(n);
            }
            ch2.close();
        })();

        const stage2 = (async () => {
            for await (const n of ch2) {
                ch3.send(n * 2);
            }
            ch3.close();
        })();

        const sink = (async () => {
            let sum = 0;
            for await (const n of ch3) sum += n;
            return sum;
        })();

        for (let i = 0; i < 10_000; i++) ch1.send(i);
        ch1.close();

        await Promise.all([stage1, stage2, sink]);
    });

    bench("Node PassThrough 3-Stage Pipeline", async () => {
        const s1 = new PassThrough({ objectMode: true });
        const s2 = new PassThrough({ objectMode: true });
        const s3 = new PassThrough({ objectMode: true });

        const stage1 = (async () => {
            for await (const n of s1 as AsyncIterable<number>) {
                if ((n & 1) === 0) s2.write(n);
            }
            s2.end();
        })();

        const stage2 = (async () => {
            for await (const n of s2 as AsyncIterable<number>) {
                s3.write(n * 2);
            }
            s3.end();
        })();

        const sink = (async () => {
            let sum = 0;
            for await (const n of s3 as AsyncIterable<number>) sum += n;
            return sum;
        })();

        for (let i = 0; i < 10_000; i++) s1.write(i);
        s1.end();

        await Promise.all([stage1, stage2, sink]);
    });
});

// ==========================================
// 3. Asymmetric Mixed-Speed Consumers (10 Fast + 1 Slow Consumer)
// ==========================================
group("3. Mixed-Speed Consumers (5,000 msgs: 10 Fast + 1 Lagging)", () => {
    bench("Channel (10 fast + 1 lagging)", async () => {
        const ch = new Channel<number>({ mode: "safe" });

        const fastConsumers = Array.from({ length: 10 }, async () => {
            let sum = 0;
            for await (const val of ch) sum += val;
            return sum;
        });

        const slowConsumer = (async () => {
            let sum = 0;
            let count = 0;
            for await (const val of ch) {
                sum += val;
                if (++count % 50 === 0) await Promise.resolve();
            }
            return sum;
        })();

        for (let i = 0; i < 5_000; i++) ch.send(i);
        ch.close();

        await Promise.all([...fastConsumers, slowConsumer]);
    });
});

// ==========================================
// 4. High Subscriber Churn (2,000 short-lived consumers joining & breaking)
// ==========================================
group("4. High Subscriber Churn (2,000 dynamic subscribe + break cycles)", () => {
    bench("Channel subscribe + early break churn", async () => {
        const ch = new Channel<number>({ mode: "safe" });

        for (let i = 0; i < 2_000; i++) {
            const sub = (async () => {
                for await (const val of ch) {
                    if (val === i) break;
                }
            })();
            ch.send(i);
            await sub;
        }

        ch.close();
    });

    bench("Node events.on() + AbortController churn", async () => {
        const ee = new EventEmitter();

        for (let i = 0; i < 2_000; i++) {
            const ac = new AbortController();
            const sub = (async () => {
                try {
                    for await (const [val] of on(ee, "data", { signal: ac.signal }) as AsyncIterableIterator<[number]>) {
                        if (val === i) ac.abort();
                    }
                } catch (e: unknown) {
                    if (e instanceof Error && e.name !== "AbortError") throw e;
                }
            })();
            ee.emit("data", i);
            await sub;
        }
    });
});
// ==========================================
// 5. Large Payload Objects (10,000 structured JSON-like events)
// ==========================================
interface OrderEvent {
    id: number;
    type: string;
    timestamp: number;
    meta: {
        region: string;
        priority: number;
    };
}
group("5. Structured Event Objects (10,000 payloads × 5 consumers)", () => {
    const payloads: OrderEvent[] = Array.from({ length: 10_000 }, (_, id) => ({
        id,
        type: "ORDER_CREATED",
        timestamp: 1700000000 + id,
        meta: { region: "eu-west", priority: id % 3 },
    }));
    bench("Channel (5 consumers)", async () => {
        const ch = new Channel({ mode: "safe" });
        const consumers = Array.from({ length: 5 }, async () => {
            let total = 0;
            for await (const evt of ch) total += evt.id;
            return total;
        });
        for (let i = 0; i < payloads.length; i++) {
            ch.send(payloads[i]!);
        }
        ch.close();
        await Promise.all(consumers);
    });
});
await run();