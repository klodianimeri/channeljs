type ResolveType<T = any> = (value: T | PromiseLike<T>) => void;

type ItemType<T = any, TReturn = any> = IteratorResult<T, TReturn> | ResolveType<IteratorResult<T, TReturn>>;

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

export class Channel<T = any, TReturn = any> {
    #items: Set<Array<ItemType<T, TReturn>>> = new Set<Array<ItemType<T, TReturn>>>();

    #push(ir: IteratorResult<T, TReturn>) {
        for (const items of this.#items) {
            if (items.length === 1 && typeof items[0] === 'function') {
                (items.shift() as ResolveType<IteratorResult<T, TReturn>>)(ir);
                continue;
            }

            items.push(ir);
        }
    }

    send(data: T) {
        this.#push({ done: false, value: data });
    }

    close() {
        this.#push({ done: true, value: undefined });
        this.#items.clear();
    }

    [Symbol.asyncIterator]() {
        let items: Array<ItemType<T, TReturn>> = new Array<ItemType<T, TReturn>>();
        let channel = this;
        channel.#items.add(items);

        return {
            next(): IteratorResult<T> | Promise<IteratorResult<T>> {
                if (items.length) return items.shift() as IteratorResult<T>;

                const { promise, resolve } = Promise.withResolvers<IteratorResult<T>>();

                items.push(resolve);

                return promise;
            },
            return(value?: TReturn): Promise<IteratorReturnResult<TReturn>> {
                channel.#items.delete(items);
                return Promise.resolve({ done: true, value: value });
            }
        };
    }
}