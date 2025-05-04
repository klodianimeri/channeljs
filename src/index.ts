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

export class Channel<T = any> {
    #items: Set<Array<PromiseWithResolvers<IteratorResult<T>>>> = new Set<Array<PromiseWithResolvers<IteratorResult<T>>>>();

    send(data: T) {
        for (const items of this.#items) {
            items.push(Promise.withResolvers<IteratorResult<T>>());
            items[items.length - 2].resolve({ done: false, value: data });
        }
    }

    close() {
        for (const items of this.#items) {
            items[items.length - 1].resolve({ done: true, value: undefined });
            this.#items.delete(items);
        }
    }

    [Symbol.asyncIterator]() {
        let items: Array<PromiseWithResolvers<any>> = new Array<PromiseWithResolvers<any>>(Promise.withResolvers<IteratorResult<T>>());
        let channel = this;
        channel.#items.add(items);

        return {
            async next(): Promise<IteratorResult<T>> {
                if (items.length > 1) items.shift();
                return items[0].promise;
            },
            return(value?: any): Promise<IteratorReturnResult<T>> {
                channel.#items.delete(items);
                return Promise.resolve({ done: true, value: value });
            }
        };
    }
}