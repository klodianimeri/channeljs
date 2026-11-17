export type ChannelMode = "raw" | "safe" | "strict";
export interface ChannelOptions {
  mode?: ChannelMode;
}
export declare class ChannelClosedError extends Error {
  constructor(message?: string);
}
export declare class Channel<T = any, TReturn = any> {
  #private;
  constructor(options?: ChannelOptions);
  get closed(): boolean;
  get mode(): ChannelMode;
  send(data: T): void;
  close(value?: TReturn): void;
  [Symbol.asyncIterator](): AsyncIterableIterator<T, TReturn>;
}