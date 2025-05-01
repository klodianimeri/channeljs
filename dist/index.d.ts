export declare class Channel<T = any> {
    #private;
    constructor();
    send(data: T): void;
    close(): void;
    [Symbol.asyncIterator](): {
        next(): Promise<IteratorYieldResult<T>>;
        return(value?: any): Promise<IteratorReturnResult<T>>;
    };
}
