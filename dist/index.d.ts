export declare class Channel<T = any> {
    #private;
    send(data: T): void;
    close(): void;
    [Symbol.asyncIterator](): {
        next(): Promise<IteratorResult<T>>;
        return(value?: any): Promise<IteratorReturnResult<T>>;
    };
}
