export class Channel<T = any> {
    #items: Set<Array<PromiseWithResolvers<IteratorResult<T>>>> = new Set<Array<PromiseWithResolvers<IteratorResult<T>>>>();

    constructor() { }

    send(data: T) {
        for (const items of this.#items) {
            items.push(Channel.#withResolvers<T>());
            items[items.length - 2].resolve({ done: false, value: data });
        }
    }

    close() {
        for (const items of this.#items) {
            items[items.length - 1].resolve({ done: true, value: undefined });
            this.#items.delete(items);
        }
    }

    static #withResolvers<T>() {
        let resolve, reject;
        const promise = new Promise<IteratorResult<T>>((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { resolve, reject, promise }
    }

    [Symbol.asyncIterator]() {
        let channel = this;
        let items: Array<PromiseWithResolvers<any>> = new Array<PromiseWithResolvers<any>>(Channel.#withResolvers<T>());
        channel.#items.add(items);

        return {
            async next(): Promise<IteratorYieldResult<T>> {
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