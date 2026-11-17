type ResolveType<T = any> = (value: T | PromiseLike<T>) => void;

interface Consumer<T, TReturn> {
    buffer: Array<IteratorResult<T, TReturn> | undefined>;
    head: number;
    resolve: ResolveType<IteratorResult<T, TReturn>> | null;
}

export type ChannelMode = "raw" | "safe" | "strict";

export interface ChannelOptions {
    mode?: ChannelMode;
}

if (typeof Promise.withResolvers === "undefined") {
    Promise.withResolvers = <T>() => {
        let resolve!: (value: T | PromiseLike<T>) => void;
        let reject!: (reason?: unknown) => void;
        const promise = new Promise<T>((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve, reject };
    };
}

export class ChannelClosedError extends Error {
    constructor(message = "Cannot perform operation on a closed channel") {
        super(message);
        this.name = "ChannelClosedError";
    }
}

export class Channel<T = any, TReturn = any> {
    #consumers = new Set<Consumer<T, TReturn>>();
    #closed = false;
    #closeValue: TReturn = undefined as TReturn;
    #mode: ChannelMode;

    constructor(options: ChannelOptions = {}) {
        this.#mode = options.mode ?? "raw";
    }

    get closed(): boolean {
        return this.#closed;
    }

    get mode(): ChannelMode {
        return this.#mode;
    }

    #push(ir: IteratorResult<T, TReturn>): void {
        for (const consumer of this.#consumers) {
            if (consumer.resolve !== null) {
                const res = consumer.resolve;
                consumer.resolve = null;
                res(ir);
            } else {
                consumer.buffer.push(ir);
            }
        }
    }

    send(data: T): void {
        if (this.#closed) {
            if (this.#mode === "strict") {
                throw new ChannelClosedError("Cannot send to a closed channel");
            }
            if (this.#mode === "safe") {
                return;
            }
        }
        this.#push({ done: false, value: data });
    }

    close(value?: TReturn): void {
        if (this.#closed) {
            if (this.#mode === "strict") {
                throw new ChannelClosedError("Channel is already closed");
            }
            if (this.#mode === "safe") {
                return;
            }
        }
        this.#closed = true;
        this.#closeValue = value as TReturn;
        this.#push({ done: true, value: value as TReturn });
        this.#consumers.clear();
    }

    [Symbol.asyncIterator](): AsyncIterableIterator<T, TReturn> {
        if (this.#closed && this.#mode !== "raw") {
            const closeValue = this.#closeValue;
            return {
                [Symbol.asyncIterator]() {
                    return this;
                },
                next(): Promise<IteratorResult<T, TReturn>> {
                    return { done: true, value: closeValue } as unknown as Promise<IteratorResult<T, TReturn>>;
                },
                return(value?: TReturn | PromiseLike<TReturn>): Promise<IteratorResult<T, TReturn>> {
                    return Promise.resolve({ done: true, value: value as TReturn });
                },
                throw(e?: unknown): Promise<IteratorResult<T, TReturn>> {
                    return Promise.reject(e);
                }
            };
        }

        const channel = this;
        const consumer: Consumer<T, TReturn> = {
            buffer: [],
            head: 0,
            resolve: null,
        };

        this.#consumers.add(consumer);

        return {
            [Symbol.asyncIterator]() {
                return this;
            },
            next(): Promise<IteratorResult<T, TReturn>> {
                if (consumer.head < consumer.buffer.length) {
                    const ir = consumer.buffer[consumer.head] as IteratorResult<T, TReturn>;
                    consumer.buffer[consumer.head++] = undefined;

                    if (consumer.head === consumer.buffer.length) {
                        consumer.buffer.length = 0;
                        consumer.head = 0;
                    }

                    return ir as unknown as Promise<IteratorResult<T, TReturn>>;
                }

                const { promise, resolve } = Promise.withResolvers<IteratorResult<T, TReturn>>();
                consumer.resolve = resolve;
                return promise;
            },
            return(value?: TReturn | PromiseLike<TReturn>): Promise<IteratorResult<T, TReturn>> {
                channel.#consumers.delete(consumer);
                consumer.buffer.length = 0;
                return Promise.resolve({ done: true, value: value as TReturn });
            },
            throw(e?: unknown): Promise<IteratorResult<T, TReturn>> {
                channel.#consumers.delete(consumer);
                consumer.buffer.length = 0;
                return Promise.reject(e);
            }
        };
    }
}
