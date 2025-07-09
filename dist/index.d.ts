export declare class Channel<T = any, TReturn = any> {
    #private;
    send(data: T): void;
    close(): void;
    [Symbol.asyncIterator](): {
        next(): Promise<IteratorResult<T>>;
        return(value?: TReturn): Promise<IteratorReturnResult<TReturn>>;
    };
}
